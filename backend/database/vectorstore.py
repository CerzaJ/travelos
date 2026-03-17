"""
Configuración de la Base de Datos Vectorial (Pinecone).
Contiene la lógica para generar embeddings y gestionar el almacenamiento
de documentos SOP para el sistema RAG usando LangChain + Pinecone.
"""

from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from pinecone import Pinecone
import os


# Inicializar Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
indice = pc.Index(
    name="travelos",
    host="https://travelos-82r1wo8.svc.aped-4627-b74a.pinecone.io"
)

# Configuración de embeddings
embeddings = OpenAIEmbeddings(
    model="text-embedding-ada-002",
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

# Conexión al vectorstore 
vectorstore = PineconeVectorStore(
    index=indice,
    embedding=embeddings,
    text_key="texto"
)


# Cargar documento SOP a Pinecone 
def cargar_documento_sop(ruta_pdf: str, titulo: str) -> int:
    """
    Carga un PDF de SOP a Pinecone.
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
        chunk_overlap=50  # overlap para no perder contexto entre fragmentos
    )
    fragmentos = splitter.split_documents(paginas)

    # 3. Agregar metadata a cada fragmento
    for fragmento in fragmentos:
        fragmento.metadata["titulo_documento"] = titulo
        fragmento.metadata["ruta_archivo"] = ruta_pdf

    # 4. Guardar en Pinecone (genera embeddings automáticamente)
    vectorstore.add_documents(fragmentos)

    return len(fragmentos)


# Buscar en SOPs
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
    resultados = vectorstore.similarity_search(consulta, k=top_k)

    # Formatear resultados para que los agentes los entiendan fácil
    fragmentos_formateados = []
    for r in resultados:
        fragmentos_formateados.append({
            "contenido": r.page_content,
            "documento": r.metadata.get("titulo_documento", "Sin título"),
            "pagina": r.metadata.get("page", 0)
        })

    return fragmentos_formateados


# Eliminar documentos de un SOP
def eliminar_documento_sop(titulo: str) -> bool:
    """
    Elimina todos los fragmentos de un documento SOP de Pinecone.
    Útil cuando se sube una versión actualizada del documento.

    Args:
        titulo: Título del documento a eliminar

    Returns:
        bool: True si se eliminó correctamente
    """
    try:
        vectorstore.delete(filter={"titulo_documento": {"$eq": titulo}})
        return True
    except Exception as e:
        print(f"Error eliminando documento: {e}")
        return False