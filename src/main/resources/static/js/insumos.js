let modalNuevoInsumoInstance = null;
let modalDetalleRecetaInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización del Modal de Nuevo Insumo
    const modalInsumoEl = document.getElementById('modalNuevoInsumo');
    if (modalInsumoEl) {
        modalNuevoInsumoInstance = new bootstrap.Modal(modalInsumoEl);
    }

    // Inicialización del Modal de Desglose de Receta Unificada
    const modalRecetaEl = document.getElementById('modalDetalleReceta');
    if (modalRecetaEl) {
        modalDetalleRecetaInstance = new bootstrap.Modal(modalRecetaEl);
    }

    // Interceptor para el loader preventivo al crear un nuevo ingrediente
    const formNuevo = document.getElementById('formNuevoInsumo');
    if (formNuevo) {
        formNuevo.addEventListener('submit', () => {
            AppUtils.showLoading(true);
        });
    }

    // Interceptor dinámico para validar la correcta asignación de recetas
    const formAsignar = document.getElementById('formAsignar');
    if (formAsignar) {
        formAsignar.addEventListener('submit', (e) => {
            const selectPlato = document.getElementById('selectProducto').value;
            if (!selectPlato) {
                e.preventDefault();
                AppUtils.showNotification('Debe seleccionar un plato base para la receta', 'error');
            } else {
                AppUtils.showLoading(true);
            }
        });
    }

    // Escucha asíncrona mediante JQuery delegando los clicks a "Ver Receta"
    $('.btn-ver-receta').on('click', function() {
        const idProducto = $(this).data('id');
        const nombreProducto = $(this).data('nombre');
        cargarDetalleReceta(idProducto, nombreProducto);
    });
});

function abrirModalNuevoInsumo() {
    AppUtils.clearForm('#formNuevoInsumo');
    if (modalNuevoInsumoInstance) {
        modalNuevoInsumoInstance.show();
    }
}

function actualizarAccion(idProducto) {
    if (idProducto) {
        document.getElementById('formAsignar').action = '/insumos/producto/' + idProducto + '/agregar';
    }
}

/**
 * Consulta asíncronamente al backend los ingredientes vinculados a un plato base
 * e inyecta dinámicamente las filas en el modal de desglose.
 */
async function cargarDetalleReceta(idProducto, nombreProducto) {
    document.getElementById('tituloModalReceta').innerHTML = `<i class="bi bi-journal-text me-2"></i>Receta: ${nombreProducto}`;
    const cuerpo = document.getElementById('cuerpoDetalleReceta');

    cuerpo.innerHTML = '<tr><td colspan="4" class="text-center py-3"><span class="spinner-border spinner-border-sm text-primary"></span> Cargando ingredientes...</td></tr>';

    if (modalDetalleRecetaInstance) {
        modalDetalleRecetaInstance.show();
    }

    try {
        const response = await fetch(`/insumos/producto/${idProducto}`);
        const datos = await response.json();

        if (datos.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-muted">Este plato no tiene insumos asignados todavía.</td></tr>';
            return;
        }

        cuerpo.innerHTML = datos.map(item => `
            <tr>
                <td class="fw-semibold text-dark">${item.nombreInsumo}</td>
                <td class="text-muted">${item.unidadMedida}</td>
                <td class="text-end fw-bold">${item.cantidadUsada.toFixed(3)}</td>
                <td class="text-center">
                    <form action="/insumos/producto/receta/eliminar/${item.id}" method="post" class="m-0" onsubmit="confirmarQuitarInsumo(event, ${item.id})">
                        <button type="submit" class="btn btn-link text-danger p-0 border-0 text-decoration-none" title="Retirar de la receta">
                            <i class="bi bi-trash"></i> Retirar
                        </button>
                    </form>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error(error);
        cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3">Error al obtener la composición.</td></tr>';
    }
}

async function editarInsumo(id) {
    const nombre = document.getElementById('nombre_' + id).value;
    const unidadMedida = document.getElementById('unidad_' + id).value;
    const stockActual = document.getElementById('stockActual_' + id).value;
    const stockMinimo = document.getElementById('stockMinimo_' + id).value;

    AppUtils.showLoading(true);

    try {
        const response = await fetch('/insumos/editar/' + id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, nombre, unidadMedida, stockActual, stockMinimo })
        });

        AppUtils.showLoading(false);

        if (response.ok) {
            AppUtils.showNotification('Insumo actualizado con éxito', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            AppUtils.showNotification('No se pudo actualizar el registro', 'error');
        }
    } catch (error) {
        AppUtils.showLoading(false);
        console.error(error);
        AppUtils.showNotification('Error de comunicación con el servidor', 'error');
    }
}

function confirmarEliminacion(event, id) {
    event.preventDefault();
    AppUtils.showConfirmationDialog({
        title: '¿Eliminar del inventario?',
        text: 'Esta acción removerá el ingrediente del catálogo operativo.',
        icon: 'warning',
        confirmButtonColor: '#933D2D',
        confirmButtonText: 'Sí, eliminar'
    }, function() {
        AppUtils.showLoading(true);
        document.getElementById('form-eliminar-' + id).submit();
    });
}

function confirmarQuitarInsumo(event, id) {
    event.preventDefault();
    const formulario = event.target;

    AppUtils.showConfirmationDialog({
        title: '¿Retirar insumo de la receta?',
        text: 'El plato ya no descontará este ingrediente cuando sea despachado desde cocina.',
        icon: 'warning',
        confirmButtonColor: '#933D2D',
        confirmButtonText: 'Sí, retirar'
    }, function() {
        AppUtils.showLoading(true);
        formulario.submit();
    });
}