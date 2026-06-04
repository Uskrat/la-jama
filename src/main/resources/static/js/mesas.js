let currentMesaId = null;
let currentMesaNumero = null;
let currentPedidoId = null;
let mesaModal = null;
let precuentaModal = null;

let modoUnificacionActivo = false;

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
    audio.play().catch(e => console.log("Sonido bloqueado"));

    AppUtils.showNotification(`📢 AVISO: ${mensaje}`, 'warning');
    setTimeout(() => { window.location.reload(); }, 2500);
}

document.addEventListener('DOMContentLoaded', function() {
    const modalElement = document.getElementById('modalMesa');
    if (modalElement) mesaModal = new bootstrap.Modal(modalElement);

    const precuentaElement = document.getElementById('modalPrecuenta');
    if (precuentaElement) precuentaModal = new bootstrap.Modal(precuentaElement);

    const triggerTabList = document.querySelectorAll('#pills-tab button')
    triggerTabList.forEach(triggerEl => {
        triggerEl.addEventListener('click', event => {
            event.preventDefault()
            bootstrap.Tab.getInstance(triggerEl).show()
        })
    })
});

function gestionarClickMesa(elemento) {
    if (modoUnificacionActivo) {
        const checkbox = elemento.querySelector('.check-salon-unir');
        if (checkbox && !elemento.classList.contains('unificada') && elemento.getAttribute('data-id') !== currentMesaId) {
            checkbox.checked = !checkbox.checked;
            if (checkbox.checked) {
                elemento.style.border = "3px solid #4c1d95";
                elemento.style.transform = "scale(0.96)";
            } else {
                elemento.style.border = "2px solid transparent";
                elemento.style.transform = "none";
            }
            actualizarContadorUnificacion();
        }
        return;
    }
    prepararGestion(elemento);
}

function prepararGestion(elemento) {
    const id = elemento.getAttribute('data-id');
    currentMesaNumero = elemento.getAttribute('data-numero');
    const pedidoEstado = elemento.getAttribute('data-pedido-estado');

    currentPedidoId = elemento.getAttribute('data-pedido-id');
    currentMesaId = id;

    const esUnificada = elemento.classList.contains('unificada');
    const esTarjetaEstirada = elemento.classList.contains('tarjeta-unificada');
    const esPadre = elemento.getAttribute('data-es-padre') === 'SI' || esTarjetaEstirada;

    const btnEntregar = document.getElementById('btnEntregarPlato');
    const btnDesocupar = document.getElementById('btnDesocupar');
    const txtConfirmacion = document.getElementById('textoConfirmacion');
    const btnUnificar = document.getElementById('btnUnificarMesas');
    const btnAgregar = document.getElementById('btnAgregarPedido');
    const btnDesvincular = document.getElementById('btnDesvincularMesa');
    const btnDesagrupar = document.getElementById('btnDesagruparGrupo');
    const numMesaTexto = document.getElementById('numMesaTexto');
    const tarjetaMesa = elemento;

    const contenedorComanda = document.getElementById('contenedor-previsualizacion-comanda');
    const listaPlatos = document.getElementById('lista-platos-previsualizar');
    const txtSubtotal = document.getElementById('txt-subtotal-previsualizar');
    const avisoVacio = document.getElementById('comanda-vacia-aviso');
    const panelSubtotal = document.getElementById('panel-subtotal-modal');

    btnEntregar.classList.add('d-none');
    txtConfirmacion.classList.add('d-none');
    if (btnDesvincular) btnDesvincular.classList.add('d-none');
    if (btnDesagrupar) btnDesagrupar.classList.add('d-none');
    btnDesocupar.classList.add('disabled');
    if (btnUnificar) btnUnificar.classList.remove('d-none');
    if (btnAgregar) btnAgregar.classList.remove('d-none');

    if (contenedorComanda) contenedorComanda.classList.add('d-none');
    if (avisoVacio) avisoVacio.classList.add('d-none');
    if (panelSubtotal) panelSubtotal.classList.add('d-none');
    if (listaPlatos) listaPlatos.innerHTML = "";

    document.getElementById('lblNumero').innerText = currentMesaNumero;

    if (esPadre) {
        if (btnUnificar) btnUnificar.classList.add('d-none');
        if (btnDesagrupar) btnDesagrupar.classList.remove('d-none');
        if (pedidoEstado === 'EN_COCINA' || pedidoEstado === 'PENDIENTE') {
            if (btnDesagrupar) btnDesagrupar.classList.add('disabled');
        }
        if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO' && pedidoEstado !== 'EN_COCINA' && pedidoEstado !== 'PENDIENTE') {
            btnDesocupar.classList.remove('disabled');
        }
    }
    else if (esUnificada) {
        if (btnUnificar) btnUnificar.classList.add('d-none');
        if (btnAgregar) btnAgregar.classList.add('d-none');
        btnDesocupar.classList.add('disabled');
        if (btnDesvincular) btnDesvincular.classList.remove('d-none');
        document.getElementById('lblNumero').innerText = currentMesaNumero + " (Anexada)";
    }
    else {
        if (!currentPedidoId || pedidoEstado === 'NINGUNO') {
            if (avisoVacio) avisoVacio.classList.remove('d-none');
            if (mesaModal) mesaModal.show();
            return;
        }

        if (tarjetaMesa.classList.contains('lista-para-recoger')) {
            numMesaTexto.innerText = currentMesaNumero;
            txtConfirmacion.classList.remove('d-none');
            btnEntregar.classList.remove('d-none');
            if (btnUnificar) btnUnificar.classList.remove('d-none');
        }
        else if (pedidoEstado === 'ASIGNADO') {
            btnDesocupar.classList.remove('disabled');
        }
    }

    if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO') {
        fetch(`/admin/mesas/precuenta/${currentMesaNumero}`)
            .then(res => {
                if (!res.ok) throw new Error("Sin consumos");
                return res.json();
            })
            .then(data => {
                txtSubtotal.innerText = data.montoTotal.toFixed(2);
                listaPlatos.innerHTML = "";

                if (data.detalles.length === 0) {
                    if (avisoVacio) avisoVacio.classList.remove('d-none');
                    return;
                }

                data.detalles.forEach(d => {
                                    // Verificamos explícitamente el estado:
                                    // 1. cocinado=false -> "En cocina" (Rojo)
                                    // 2. cocinado=true && entregado=false -> "Listo" (Verde - Botón Entregar visible)
                                    // 3. cocinado=true && entregado=true -> "Entregado" (Gris - Botón oculto)

                                    let badgeColor = 'bg-danger';
                                    let badgeTexto = 'En cocina';

                                    if (d.cocinado && d.entregado) {
                                        badgeColor = 'bg-secondary';
                                        badgeTexto = 'Entregado';
                                    } else if (d.cocinado) {
                                        badgeColor = 'bg-success';
                                        badgeTexto = 'Listo';
                                    }

                                    // Botón Eliminar: Solo si aún no ha entrado a cocina (cocinado == false)
                                    let btnEliminarHTML = !d.cocinado ? `
                                        <button class="btn btn-sm btn-link text-danger p-1 ms-1" title="Eliminar plato" onclick="eliminarItemComanda(${currentPedidoId}, ${d.producto.id}, '${d.producto.nombre}')">
                                            <i class="bi bi-trash3-fill fs-5"></i>
                                        </button>` : `<button class="btn btn-sm btn-link text-muted p-1 ms-1" disabled><i class="bi bi-trash3 opacity-50 fs-5"></i></button>`;

                                    // Botón Entregar: Solo si está cocinado y NO ha sido entregado
                                    let btnCheckUnitarioHTML = (d.cocinado && !d.entregado) ? `
                                        <button class="btn btn-sm btn-warning text-dark px-2 py-1 rounded-pill ms-1" onclick="entregarPlatoUnitario(${currentPedidoId}, ${d.producto.id}, '${d.producto.nombre}')" style="font-size: 0.75rem; font-weight:700;">
                                            <i class="bi bi-check2"></i> Entregar
                                        </button>` : '';

                                    const itemHTML = `
                                        <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light border" style="font-size: 0.9rem; border-left: 4px solid var(--lajama-green) !important;">
                                            <div class="d-flex align-items-center gap-2" style="max-width: 50%;">
                                                <span class="badge bg-dark text-white rounded-pill fw-bold">${d.cantidad}</span>
                                                <span class="text-dark fw-semibold text-truncate" style="max-width: 140px;">${d.producto.nombre}</span>
                                            </div>
                                            <div class="d-flex align-items-center gap-2">
                                                <span class="text-muted small fw-bold">S/. ${d.subtotal.toFixed(2)}</span>
                                                <span class="badge ${badgeColor} rounded-pill px-2 py-1" style="font-size: 0.7rem;">${badgeTexto}</span>
                                                ${btnCheckUnitarioHTML}
                                                ${btnEliminarHTML}
                                            </div>
                                        </div>
                                    `;
                                    listaPlatos.innerHTML += itemHTML;
                                });

                if (contenedorComanda) contenedorComanda.classList.remove('d-none');
                if (panelSubtotal) panelSubtotal.classList.remove('d-none');
                if (avisoVacio) avisoVacio.classList.add('d-none');
            })
            .catch(err => {
                console.warn("Mesa unificada temporalmente vacía:", err);
                if (avisoVacio) avisoVacio.classList.remove('d-none');
                if (panelSubtotal) panelSubtotal.classList.add('d-none');
            });
    } else {
        if (avisoVacio) avisoVacio.classList.remove('d-none');
        if (panelSubtotal) panelSubtotal.classList.add('d-none');
    }

    if (mesaModal) mesaModal.show();
}

// NUEVA FUNCIÓN: CONFORMAR ENTREGA POR ITEM INDIVIDUAL
function entregarPlatoUnitario(pedidoId, productoId, nombreProducto) {
    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Entrega?',
        text: `¿Confirmas que ya serviste "${nombreProducto}" en la Mesa N° ${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, entregado'
    }, async function() {
        if (mesaModal) mesaModal.hide();
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("productoId", productoId);

        try {
            const res = await fetch('/admin/mesas/comanda/entregar-item', {
                method: 'POST',
                body: params
            });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Plato entregado correctamente", "success");
                setTimeout(() => window.location.reload(), 800);
            } else {
                AppUtils.showNotification("Error al registrar la entrega", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
            AppUtils.showNotification("Sin respuesta del servidor", "error");
        }
    });
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

function marcarComoEntregado() {
    if (!currentMesaNumero) return;
    AppUtils.showConfirmationDialog({
        title: '¿Registrar Conformidad General?',
        text: `¿Confirmas que todo el lote de cocina está conforme en la Mesa #${currentMesaNumero}?`,
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
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
}

function eliminarItemComanda(pedidoId, productoId, nombreProducto) {
    AppUtils.showConfirmationDialog({
        title: '¿Eliminar de la Comanda?',
        text: `¿Estás seguro de remover "${nombreProducto}" de la orden actual? Se recalcularán los importes.`,
        icon: 'warning',
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, remover plato'
    }, async function() {
        if (mesaModal) mesaModal.hide();
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("productoId", productoId);

        try {
            const res = await fetch("/admin/mesas/comanda/eliminar-item", {
                method: "POST",
                body: params
            });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Producto removido con éxito", "success");
                setTimeout(() => window.location.reload(), 800);
            } else {
                const errorText = await res.text();
                AppUtils.showNotification(errorText || "Error al eliminar el producto", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
        }
    });
}

function activarModoSeleccionUnificacion() {
    if (!currentMesaId) return;
    modoUnificacionActivo = true;
    if (mesaModal) mesaModal.hide();

    document.getElementById("txtMesaPadreHerramienta").innerText = currentMesaNumero;
    document.getElementById("barre-unificacion").classList.remove("d-none");
    document.getElementById("barre-unificacion").classList.add("d-flex");

    document.querySelectorAll(".mesa-box").forEach(box => {
        const idMesaBox = box.getAttribute("data-id");
        if (box.classList.contains("unificada") || idMesaBox === currentMesaId) {
            box.style.opacity = "0.4";
            box.style.pointerEvents = "none";
        } else {
            box.querySelector(".checkbox-seleccion-unificacion").classList.remove("d-none");
        }
    });
    actualizarContadorUnificacion();
}

function cancelarModoUnificacion() {
    modoUnificacionActivo = false;
    document.getElementById("barre-unificacion").classList.add("d-none");
    document.getElementById("barre-unificacion").classList.remove("d-flex");

    document.querySelectorAll(".mesa-box").forEach(box => {
        box.style.opacity = "1";
        box.style.pointerEvents = "auto";
        box.style.border = "2px solid transparent";
        box.style.transform = "none";
        const check = box.querySelector(".check-salon-unir");
        if (check) check.checked = false;
        const checkDiv = box.querySelector(".checkbox-seleccion-unificacion");
        if (checkDiv) checkDiv.classList.add("d-none");
    });
}

function actualizarContadorUnificacion() {
    const seleccionadas = document.querySelectorAll(".check-salon-unir:checked").length;
    document.getElementById("count-seleccionadas").innerText = seleccionadas;
}

function procesarUnificacionDirecta() {
    const checks = document.querySelectorAll(".check-salon-unir:checked");
    if (checks.length === 0) {
        AppUtils.showNotification("Por favor, selecciona al menos una mesa en el plano.", "warning");
        return;
    }
    const idsHijas = Array.from(checks).map(c => c.value);

    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Agrupación Masiva?',
        text: `¿Estás seguro de anexar estas ${idsHijas.length} mesas a la cuenta de la Mesa #${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, agrupar mesas'
    }, async function() {
        cancelarModoUnificacion();
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("idMesaPrincipal", currentMesaId);
        idsHijas.forEach(id => params.append("idsMesasHijas", id));

        try {
            const res = await fetch("/admin/mesas/unificar", { method: "POST", body: params });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Mesas unificadas correctamente", "success");
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
}

function procesarDesvincularMesa() {
    procesarDesvinculacion();
}

function procesarDesvinculacion() {
    AppUtils.showConfirmationDialog({
        title: '¿Desunificar Mesa?',
        text: `La Mesa #${currentMesaNumero} volverá a estar libre físicamente.`,
        icon: 'warning',
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, liberar mesa'
    }, async function() {
        if (mesaModal) mesaModal.hide();
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/mesas/desvincular/${currentMesaId}`, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Mesa desvinculada y libre", "success");
                setTimeout(() => window.location.reload(), 800);
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
}

async function validarDesocupar() {
    if (!currentMesaNumero) return;
    let tarjetaMesa = document.querySelector(`.mesa-box[data-numero="${currentMesaNumero}"]`);
    if (tarjetaMesa) {
        const pedidoEstadoActual = tarjetaMesa.getAttribute('data-pedido-estado');
        const estadosNoCobrar = ['EN_COCINA', 'PENDIENTE'];
        if (estadosNoCobrar.includes(pedidoEstadoActual)) {
            AppUtils.showNotification(`¡No puedes cobrar la Mesa #${currentMesaNumero}! Aún hay productos en cocina.`, "warning");
            return;
        }
    }
    if (!currentPedidoId || currentPedidoId === "") {
        AppUtils.showNotification("Esta cuenta grupal no registra consumos activos.", "warning");
        return;
    }

    AppUtils.showLoading(true);
    try {
        const res = await fetch('/admin/mesas/precuenta/' + currentMesaNumero);
        AppUtils.showLoading(false);
        if (!res.ok) return;

        const data = await res.json();
        document.getElementById('precuentaNumMesa').innerText = currentMesaNumero;
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
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
}

function procesarDesfragmentacionGrupo() {
    if (!currentMesaId) return;
    AppUtils.showConfirmationDialog({
        title: '¿Desagrupar Todo el Bloque?',
        text: `Se disolverá el grupo de mesas colectivas.`,
        icon: 'warning',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, desagrupar todo'
    }, async function() {
        if (mesaModal) mesaModal.hide();
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/mesas/desagrupar-grupo/${currentMesaId}`, { method: 'POST' });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Grupo disuelto con éxito", "success");
                setTimeout(() => window.location.reload(), 800);
            }
        } catch (error) {
            AppUtils.showLoading(false);
            window.location.reload();
        }
    });
}