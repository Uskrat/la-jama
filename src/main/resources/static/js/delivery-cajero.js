/**
 * LA JAMA - Módulo Delivery (OpenStreetMap Version)
 */
let carrito = [];
let mapaPreview;
let marcadorPreview = null;
let tipoPedidoCajero = 'DELIVERY';

document.addEventListener('DOMContentLoaded', () => {
    initModuloEntrega();
    configurarBuscadorProductos();
});

function initModuloEntrega() {
    // 1. Inicializar Mapa (Centrado en Chiclayo)
    mapaPreview = L.map('mapa-preview').setView([-6.771, -79.838], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapaPreview);

    // 2. Configurar Buscador Gratuito COORDENADAS EXACTAS
    const provider = new window.GeoSearch.OpenStreetMapProvider({
        params: {
            'accept-language': 'es',
            countrycodes: 'pe',
            viewbox: '-79.9500,-6.7000,-79.7400,-6.8500',
            bounded: 1
        }
    });

    const searchControl = new window.GeoSearch.GeoSearchControl({
        provider: provider,
        style: 'bar',
        container: document.getElementById('search-container'),
        showMarker: false,
        autoClose: true,
        searchLabel: 'Escribe calle o lugar en Chiclayo...'
    });

    mapaPreview.addControl(searchControl);

    // 3. Evento al seleccionar ubicación desde el buscador flotante
    mapaPreview.on('geosearch/showlocation', (result) => {
        const { x, y, label } = result.location; // x=lng, y=lat
        actualizarPuntoEntrega(y, x, label);
    });

    // 4. NUEVO: Evento de Clic Directo en el Mapa (Sin Errores)
    mapaPreview.on('click', async (e) => {
        const { lat, lng } = e.latlng;

        // Ponemos un texto temporal mientras consulta la calle exacta
        document.getElementById('lat').value = lat.toFixed(6);
        document.getElementById('lng').value = lng.toFixed(6);
        document.getElementById('inputDireccion').value = "Obteniendo dirección exacta...";

        // Mover o crear el marcador de inmediato para que la interfaz responda rápido
        dibujarMarcador(lat, lng, "Cargando dirección...");

        try {
            // Reverse Geocoding usando el Nominatim oficial de OSM
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`);
            const data = await response.json();

            // Si encuentra la dirección, la acortamos para que no sea un texto gigante
            const direccionReal = data.display_name ? data.display_name : `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

            // Actualizamos los campos finales con el nombre real del lugar cliqueado
            actualizarPuntoEntrega(lat, lng, direccionReal);

        } catch (error) {
            console.error("Error al obtener la dirección por click:", error);
            // Si el servidor externo falla, no se cae la app; guardamos las coordenadas como dirección
            actualizarPuntoEntrega(lat, lng, `Dirección seleccionada (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
    });
}

// FUNCIONES AUXILIARES DE SOPORTE (Para mantener el código limpio y ordenado)
function actualizarPuntoEntrega(lat, lng, direccion) {
    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;
    document.getElementById('inputDireccion').value = direccion;

    dibujarMarcador(lat, lng, direccion);
    mapaPreview.setView([lat, lng], 16);
}

function dibujarMarcador(lat, lng, textoPopup) {
    if (marcadorPreview) mapaPreview.removeLayer(marcadorPreview);

    marcadorPreview = L.marker([lat, lng]).addTo(mapaPreview)
        .bindPopup(`<b>Punto de Entrega:</b><br>${textoPopup}`)
        .openPopup();
}

function agregarAlCarrito(id, nombre, precio) {
    const existe = carrito.find(item => item.id === id);
    if (existe) {
        existe.cantidad++;
        existe.subtotal = existe.cantidad * precio;
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1, subtotal: precio });
    }
    renderizarCarrito();
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    renderizarCarrito();
}

function renderizarCarrito() {
    const tabla = document.getElementById('tabla-carrito');
    const labelTotal = document.getElementById('label-total');
    let html = '';
    let total = 0;

    carrito.forEach(item => {
        total += item.subtotal;
        html += `
            <tr class="animate__animated animate__fadeIn">
                <td><span class="badge bg-jama rounded-pill">${item.cantidad}</span></td>
                <td class="small fw-bold">${item.nombre}</td>
                <td class="text-ocre fw-bold">S/ ${item.subtotal.toFixed(2)}</td>
                <td class="text-end">
                    <i class="bi bi-trash3 text-danger cursor-pointer" onclick="eliminarDelCarrito(${item.id})"></i>
                </td>
            </tr>
        `;
    });

    tabla.innerHTML = html || '<tr><td colspan="4" class="text-center py-4 text-muted">Carrito vacío</td></tr>';
    labelTotal.innerText = total.toFixed(2);
}

function configurarBuscadorProductos() {
    const input = document.getElementById('busqueda');
    if (input) {
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.item-producto').forEach(div => {
                const nombre = div.getAttribute('data-nombre').toLowerCase();
                div.style.display = nombre.includes(term) ? 'block' : 'none';
            });
        });
    }
}

function seleccionarTipo(tipo) {
    tipoPedidoCajero = tipo;
    const esDelivery = tipo === 'DELIVERY';

    // Botones
    document.getElementById('btnDelivery').style.background = esDelivery ? 'var(--lajama-brown)' : '#e9ecef';
    document.getElementById('btnDelivery').style.color = esDelivery ? 'white' : '#333';
    document.getElementById('btnParaLlevar').style.background = !esDelivery ? 'var(--lajama-brown)' : '#e9ecef';
    document.getElementById('btnParaLlevar').style.color = !esDelivery ? 'white' : '#333';

    // Mostrar u ocultar mapa y dirección
    document.getElementById('bloqueDir').style.display = esDelivery ? 'block' : 'none';
    document.getElementById('mapa-preview').style.display = esDelivery ? 'block' : 'none';

    // Título
    document.getElementById('tituloEntrega').innerHTML = esDelivery
        ? '<i class="bi bi-geo-alt-fill me-2"></i> Datos de Entrega'
        : '<i class="bi bi-bag me-2"></i> Datos del Cliente';
}

function confirmarPedido() {
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    const cliente = document.getElementById('cliente_nombre').value.trim();

    const esDelivery = tipoPedidoCajero === 'DELIVERY';

    if (esDelivery && (!lat || !cliente || carrito.length === 0)) {
        Swal.fire({
            icon: 'warning',
            title: 'Datos Incompletos',
            text: 'Debes buscar una dirección, ingresar el cliente y añadir productos.',
            confirmButtonColor: '#1B3A2C'
        });
        return;
    }

    if (!esDelivery && (!cliente || carrito.length === 0)) {
        Swal.fire({
            icon: 'warning',
            title: 'Datos Incompletos',
            text: 'Debes ingresar el nombre del cliente y añadir productos.',
            confirmButtonColor: '#1B3A2C'
        });
        return;
    }

    const data = {
        cliente: cliente,
        direccion: esDelivery
            ? document.getElementById('inputDireccion').value
            : 'Recojo en local',
        latitud: esDelivery ? parseFloat(lat) : null,
        longitud: esDelivery ? parseFloat(lng) : null,
        montoTotal: parseFloat(document.getElementById('label-total').innerText),
        tipoPedido: esDelivery ? 'DELIVERY' : 'LOCAL',
        listaDetalles: carrito.map(i => ({
            producto: { id: i.id },
            cantidad: i.cantidad,
            precioUnitario: i.precio,
            subtotal: i.subtotal
        }))
    };

    fetch('/admin/caja/delivery/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => {
        if (res.ok) {
            const msg = esDelivery ? 'Orden enviada a despacho' : 'Orden enviada a cocina';
            const redirect = esDelivery ? '/admin/despacho' : '/admin/caja';
            Swal.fire('¡Éxito!', msg, 'success')
                .then(() => window.location.href = redirect);
        }
    });
}