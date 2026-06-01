function updateTimers() {
    document.querySelectorAll('.timer-container').forEach(container => {
        const startAttr = container.getAttribute('data-start');
        if (!startAttr) return;

        const startTime = new Date(startAttr);
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);

        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');

        const display = container.querySelector('.timer-display');
        if (display) display.innerText = `${mins}:${secs}`;

        if (diff > 600) {
            container.classList.add('timer-urgent');
        } else {
            container.classList.remove('timer-urgent');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar cronómetros de cocina
    setInterval(updateTimers, 1000);
    updateTimers();

    // --- INTERCEPTOR DE DESPACHO CON APPUTILS ---
    const formulariosDespachar = document.querySelectorAll('.form-despachar');

    formulariosDespachar.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Frenamos el envío directo abrupto

            const pedidoId = form.querySelector('input[name="pedidoId"]').value;

            AppUtils.showConfirmationDialog({
                title: '¿Despachar de Fogones?',
                text: `¿Confirmas que toda la comanda caliente de la Orden #${pedidoId} está lista para salir al salón?`,
                icon: 'question',
                confirmButtonColor: '#1B3A2C', // Verde de La Jama
                confirmButtonText: 'Sí, despachar'
            }, function() {
                // Si el jefe de cocina confirma, bloqueamos la UI con el spinner y enviamos
                AppUtils.showLoading(true);
                form.submit();
            });
        });
    });

    // Auto-recarga del monitor cada 45 segundos para traer nuevos pedidos del salón
    setTimeout(() => {
        console.log("Recargando monitor de cocina caliente...");
        location.reload();
    }, 45000);
});