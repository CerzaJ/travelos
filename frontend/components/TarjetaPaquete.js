/**
 * Componente de Tarjeta de Paquete de Viaje.
 * Elemento visual para mostrar un resumen de la opción de paquete (vuelos, hotel, 
 * actividades, precio) dentro de la interfaz de revisión.
 */
export default function TarjetaPaquete({ destino, precio, actividades }) {
    return (
      <div style={{
        border: "1px solid #ddd",
        padding: "16px",
        borderRadius: "8px",
        marginBottom: "10px"
      }}>
        <h2>{destino}</h2>
        <p>Precio: ${precio}</p>
        <p>Actividades: {actividades}</p>
      </div>
    )
  }



  