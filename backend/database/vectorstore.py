"""
Configuración de la Base de Datos Vectorial (Milvus Lite).
Contiene la lógica para generar embeddings y gestionar el almacenamiento
de documentos SOP para el sistema RAG usando pymilvus.
"""

from pymilvus import MilvusClient, model
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader


# ── Inicializar Milvus Lite ───────────────────────────────────────────────────
# Crea un archivo local milvus_travelos.db en el proyecto
cliente = MilvusClient("milvus_travelos.db")

# ── Modelo de embeddings ──────────────────────────────────────────────────────
# Descarga automáticamente paraphrase-albert-small-v2 (~50MB)
funcion_embeddings = model.DefaultEmbeddingFunction()

# ── Crear colección si no existe ──────────────────────────────────────────────
NOMBRE_COLECCION = "sop_chunks"

if not cliente.has_collection(collection_name=NOMBRE_COLECCION):
    cliente.create_collection(
        collection_name=NOMBRE_COLECCION,
        dimension=768,  # dimensiones del modelo por defecto
    )


# ── Cargar documento SOP a Milvus ─────────────────────────────────────────────
def cargar_documento_sop(ruta_pdf: str, titulo: str) -> int:
    """
    Carga un PDF de SOP a Milvus Lite.
    Lo divide en fragmentos y genera embeddings de cada uno.

    Args:
        ruta_pdf: Ruta local del archivo PDF
        titulo: Nombre descriptivo del documento

    Returns:
        int: Cantidad de fragmentos cargados
    """
    # 1. Cargar el PDF
    loader = PyPDFLoader(ruta_pdf)
    paginas = loader.load()

    # 2. Dividir en fragmentos de ~500 palabras
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    fragmentos = splitter.split_documents(paginas)

    # 3. Extraer solo el texto de cada fragmento
    textos = [f.page_content for f in fragmentos]

    # 4. Generar embeddings
    vectores = funcion_embeddings.encode_documents(textos)

    # 5. Preparar datos para insertar
    datos = [
        {
            "id": i,
            "vector": vectores[i],
            "texto": textos[i],
            "titulo_documento": titulo,
            "ruta_archivo": ruta_pdf
        }
        for i in range(len(textos))
    ]

    # 6. Insertar en Milvus
    cliente.insert(collection_name=NOMBRE_COLECCION, data=datos)

    return len(fragmentos)


# ── Buscar en SOPs ────────────────────────────────────────────────────────────
def buscar_en_sops(consulta: str, top_k: int = 4) -> list:
    """
    Busca fragmentos relevantes en los SOPs dada una consulta.
    Usado por el Agente Coordinador para obtener políticas empresariales.

    Args:
        consulta: Pregunta o tema a buscar. Ej: "márgenes para Europa"
        top_k: Cuántos fragmentos devolver (default 4)

    Returns:
        list: Lista de fragmentos relevantes con su contenido y metadata
    """
    # Convertir la consulta a vector
    vector_consulta = funcion_embeddings.encode_queries([consulta])

    # Buscar en Milvus
    resultados = cliente.search(
        collection_name=NOMBRE_COLECCION,
        data=vector_consulta,
        limit=top_k,
        output_fields=["texto", "titulo_documento"]
    )

    # Formatear resultados para los agentes
    fragmentos_formateados = []
    for r in resultados[0]:
        fragmentos_formateados.append({
            "contenido": r["entity"]["texto"],
            "documento": r["entity"]["titulo_documento"],
            "similitud": round(r["distance"], 4)
        })

    return fragmentos_formateados


# ── Eliminar documentos de un SOP ─────────────────────────────────────────────
def eliminar_documento_sop(titulo: str) -> bool:
    """
    Elimina todos los fragmentos de un documento SOP de Milvus.
    Útil cuando se sube una versión actualizada del documento.

    Args:
        titulo: Título del documento a eliminar

    Returns:
        bool: True si se eliminó correctamente
    """
    try:
        cliente.delete(
            collection_name=NOMBRE_COLECCION,
            filter=f'titulo_documento == "{titulo}"'
        )
        return True
    except Exception as e:
        print(f"Error eliminando documento: {e}")
        return False