let currentMesaId = null;
let currentMesaNumero = null;
let currentPedidoId = null;
let mesaModal = null;
let precuentaModal = null;

// --- CONFIGURACIÓN WEBSOCKET (CONSERVADA INTEGRALMENTE) ---
var socket = new SockJS('/ws-restaurante');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Conectado a WebSocket: ' + frame);
    stompClient.subscribe('/topic/notificaciones', function (notificacion) {
        mostrarNotificacionCocina(notificacion.body);
    });
});

function mostrarNotificacionCocina(mensaje) {
    var audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Sonido bloqueado por el navegador"));

    AppUtils.showNotification(`📢 AVISO: ${mensaje}`, 'warning');
    setTimeout(() => { window.location.reload(); }, 2500);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    const modalElement = document.getElementById('modalMesa');
    if (modalElement) {
        mesaModal = new bootstrap.Modal(modalElement);
    }

    const precuentaElement = document.getElementById('modalPrecuenta');
    if (precuentaElement) {
        precuentaModal = new bootstrap.Modal(precuentaElement);
    }
});

function prepararGestion(elemento) {
    const id = elemento.getAttribute('data-id');
    currentMesaNumero = elemento.getAttribute('data-numero');
    const pedidoEstado = elemento.getAttribute('data-pedido-estado');

    currentPedidoId = elemento.getAttribute('data-pedido-id');
    currentMesaId = id;

    if (pedidoEstado === 'NINGUNO' || !currentPedidoId) {
        window.location.href = '/admin/mesero/nuevo?mesaId=' + id;
        return;
    }

    document.getElementById('lblNumero').innerText = currentMesaNumero;

    const btnEntregar = document.getElementById('btnEntregarPlato');
    const btnDesocupar = document.getElementById('btnDesocupar');
    const txtConfirmacion = document.getElementById('textoConfirmacion');
    const numMesaTexto = document.getElementById('numMesaTexto');
    const tarjetaMesa = elemento;

    btnEntregar.classList.add('d-none');
    txtConfirmacion.classList.add('d-none');
    btnDesocupar.classList.add('disabled');

    if (tarjetaMesa.classList.contains('lista-para-recoger')) {
        numMesaTexto.innerText = currentMesaNumero;
        txtConfirmacion.classList.remove('d-none');
        btnEntregar.classList.remove('d-none');
    }
    else if (pedidoEstado === 'ASIGNADO') {
        btnDesocupar.classList.remove('disabled');
    }

    if (mesaModal) mesaModal.show();
}

function irAMenu() {
    if (currentMesaId) {
        let url = '/admin/mesero/nuevo?mesaId=' + currentMesaId;
        if (currentPedidoId) {
            url += '&pedidoId=' + currentPedidoId;
        }
        window.location.href = url;
    }
}

// --- ACOPLE INTERACTIVO CON APPUTILS ---
function marcarComoEntregado() {
    if (!currentMesaNumero) {
        AppUtils.showNotification("No se ha seleccionado ninguna mesa.", "error");
        return;
    }

    AppUtils.showConfirmationDialog({
        title: '¿Registrar Conformidad?',
        text: `¿Confirmas que la orden está completa y todo conforme en la Mesa #${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Sí, todo conforme'
    }, async function() {
        if (mesaModal) mesaModal.hide();
        AppUtils.showLoading(true);

        try {
            const res = await fetch('/admin/mesero/marcar-en-mesa/' + currentPedidoId, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Servicio marcado en mesa", "success");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                AppUtils.showNotification("Error al registrar la entrega", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
            AppUtils.showNotification("Sin conexión con el servidor", "error");
        }
    });
}

async function validarDesocupar() {
    let mesaNumero = document.getElementById('lblNumero').innerText;
    let tarjetaMesa = document.querySelector(`[data-numero="${mesaNumero}"]`);

    const pedidoEstadoActual = tarjetaMesa.getAttribute('data-pedido-estado');
    const estadosNoCobrar = ['EN_COCINA', 'PENDIENTE'];

    if (estadosNoCobrar.includes(pedidoEstadoActual)) {
        AppUtils.showNotification(`¡No puedes cobrar la Mesa #${mesaNumero}! Aún hay productos en cocina.`, "warning");
        return;
    }

    AppUtils.showLoading(true);

    try {
        const res = await fetch('/admin/mesas/precuenta/' + mesaNumero);
        AppUtils.showLoading(false);
        if (!res.ok) {
            AppUtils.showNotification("No se encontraron consumos activos para esta mesa.", "warning");
            return;
        }

        const data = await res.json();

        document.getElementById('precuentaNumMesa').innerText = mesaNumero;
        document.getElementById('precuentaTotal').innerText = data.montoTotal.toFixed(2);

        const cuerpoTabla = document.getElementById('tablaPrecuentaCuerpo');
        cuerpoTabla.innerHTML = '';

        data.detalles.forEach(d => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td class="p-2">${d.producto.nombre}</td>
                <td class="text-center fw-bold p-2">${d.cantidad}</td>
                <td class="text-end p-2">S/. ${d.precioUnitario.toFixed(2)}</td>
                <td class="text-end fw-bold p-2">S/. ${d.subtotal.toFixed(2)}</td>
            `;
            cuerpoTabla.appendChild(fila);
        });

        if (mesaModal) mesaModal.hide();
        if (precuentaModal) precuentaModal.show();

    } catch (error) {
        AppUtils.showLoading(false);
        console.error(error);
        AppUtils.showNotification("Error al conectar con el servidor para la precuenta.", "error");
    }
}

function confirmarPagoFinal() {
    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Pago y Desocupar?',
        text: `Se procesará el cierre de comanda definitivo para la Mesa #${currentMesaNumero}.`,
        icon: 'warning',
        confirmButtonColor: '#166534',
        confirmButtonText: 'Sí, facturar y liberar'
    }, async function() {
        if (precuentaModal) precuentaModal.hide();
        AppUtils.showLoading(true);

        try {
            const res = await fetch(`/admin/mesero/finalizar-atencion/${currentPedidoId}?mesaId=${currentMesaId}`, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Mesa liberada correctamente", "success");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                AppUtils.showNotification("Error al liberar la mesa en el servidor", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
            AppUtils.showNotification("Sin conexión con el servidor", "error");
        }
    });
}