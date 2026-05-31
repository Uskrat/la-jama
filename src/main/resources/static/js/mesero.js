let carrito = [];
let productoTemporal = null;
let insumosProductoActual = [];

async function abrirModalInsumos(elemento) {
    const id = elemento.getAttribute('data-id');
    const nombre = elemento.getAttribute('data-nombre');
    const precio = parseFloat(elemento.getAttribute('data-precio'));

    productoTemporal = { id, nombre, precio };

    document.getElementById('modalNombrePlato').innerText = nombre;
    document.getElementById('listaInsumosModal').innerHTML = '<p class="text-muted small">Cargando insumos...</p>';
    document.getElementById('modalInsumos').classList.add('show');

    try {
        const res = await fetch('/insumos/producto/' + id);
        insumosProductoActual = await res.json();

        if (insumosProductoActual.length === 0) {
            document.getElementById('listaInsumosModal').innerHTML = '<p class="text-muted small">Este plato no tiene insumos registrados.</p>';
        } else {
            let html = '';
            insumosProductoActual.forEach(ins => {
                html += `
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" 
                               id="ins_${ins.idInsumo}" 
                               value="${ins.idInsumo}" 
                               data-nombre="${ins.nombreInsumo}"
                               checked>
                        <label class="form-check-label" for="ins_${ins.idInsumo}">
                            ${ins.nombreInsumo} (${ins.cantidadUsada} ${ins.unidadMedida})
                        </label>
                    </div>`;
            });
            document.getElementById('listaInsumosModal').innerHTML = html;
        }
    } catch (e) {
        document.getElementById('listaInsumosModal').innerHTML = '<p class="text-muted small">No se pudieron cargar los insumos.</p>';
    }
}

function cerrarModal() {
    document.getElementById('modalInsumos').classList.remove('show');
    productoTemporal = null;
    insumosProductoActual = [];
}

function confirmarAgregarAlCarrito() {
    if (!productoTemporal) return;

    // Insumos que el cliente SÍ quiere (los que quedaron marcados)
    const insumosSeleccionados = [];
    insumosProductoActual.forEach(ins => {
        const checkbox = document.getElementById('ins_' + ins.idInsumo);
        if (checkbox && checkbox.checked) {
            insumosSeleccionados.push(ins.idInsumo);
        }
    });

    // Insumos que el cliente NO quiere (desmarcados)
    const insumosSinDescontar = insumosProductoActual
        .filter(ins => {
            const cb = document.getElementById('ins_' + ins.idInsumo);
            return cb && !cb.checked;
        })
        .map(ins => ins.idInsumo);

    agregarAlCarrito(
        productoTemporal.id,
        productoTemporal.nombre,
        productoTemporal.precio,
        insumosSinDescontar
    );

    cerrarModal();
}

function agregarAlCarrito(id, nombre, precio, insumosSinDescontar = []) {
    const existe = carrito.find(item => item.productoId === id);
    if (existe) {
        existe.cantidad++;
        existe.subtotal = existe.cantidad * precio;
    } else {
        carrito.push({
            productoId: id,
            nombre,
            precio,
            cantidad: 1,
            subtotal: precio,
            insumosSinDescontar
        });
    }
    renderizarCarrito();
}

function renderizarCarrito() {
    const container = document.getElementById('lista-items');
    let total = 0;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 opacity-50">
                <i class="bi bi-cart-x" style="font-size: 3rem;"></i>
                <p class="mt-2">Comanda vacía</p>
            </div>`;
        document.getElementById('total-monto').innerText = "0.00";
        return;
    }

    let html = '';
    carrito.forEach((item, index) => {
        total += item.subtotal;
        const sinEsto = item.insumosSinDescontar && item.insumosSinDescontar.length > 0
            ? `<small class="text-danger d-block">Sin: ${item.insumosSinDescontar.join(', ')}</small>`
            : '';
        html += `
            <div class="cart-item-card shadow-sm border-0">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="d-block fw-bold text-dark">${item.nombre}</span>
                        <small class="text-muted">${item.cantidad} x S/ ${item.precio.toFixed(2)}</small>
                        ${sinEsto}
                    </div>
                    <div class="text-end">
                        <span class="d-block fw-bold text-primary">S/ ${item.subtotal.toFixed(2)}</span>
                        <button class="btn btn-sm text-danger p-0" onclick="eliminarItem(${index})">
                           <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html;
    document.getElementById('total-monto').innerText = total.toFixed(2);
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

function filtrarProductos() {
    const texto = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('.producto-card').forEach(tarjeta => {
        const nombre = tarjeta.querySelector('.nombre-producto').innerText.toLowerCase();
        tarjeta.style.display = nombre.includes(texto) ? '' : 'none';
    });
}

async function enviarPedido() {
    const urlParams = new URLSearchParams(window.location.search);
    const mesaId = urlParams.get('mesaId');
    const pedidoId = urlParams.get('pedidoId');

    if (carrito.length === 0) {
        alert("Agrega al menos un producto");
        return;
    }

    const pedido = {
        id: pedidoId ? parseInt(pedidoId) : null,
        cliente: document.getElementById('cliente').value || "Mesa " + mesaId,
        direccion: document.getElementById('direccion').value,
        listaDetalles: carrito.map(item => ({
            producto: { id: parseInt(item.productoId) },
            cantidad: item.cantidad,
            precioUnitario: item.precio,
            subtotal: item.subtotal,
            insumosSinDescontar: item.insumosSinDescontar || []
        }))
    };

    try {
        const response = await fetch('/admin/mesero/guardar' + (mesaId ? '?mesaId=' + mesaId : ''), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });

        const resultadoTexto = await response.text();
        if (resultadoTexto === "OK") {
            alert("¡Orden enviada a cocina!");
            window.location.href = '/admin/mesas';
        } else {
            alert("Error al procesar el pedido: " + resultadoTexto);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Fallo de conexión");
    }
}