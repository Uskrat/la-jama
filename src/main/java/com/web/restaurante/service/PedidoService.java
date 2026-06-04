package com.web.restaurante.service;

import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.model.enums.TipoPedido;
import com.web.restaurante.repository.EmpleadoRepository;
import com.web.restaurante.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final EmpleadoRepository empleadoRepository;
    private final InsumoService insumoService;

    private final double LAT_LOCAL = -6.787382;
    private final double LON_LOCAL = -79.842961;

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosFrios() {
        return pedidoRepository.buscarPedidosPorCocina("FRI");
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosCalientes() {
        return pedidoRepository.buscarPedidosPorCocina("CALIENTE");
    }

    @Transactional
    public void actualizarEstadoPedido(Long id, EstadoPedido nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se encontró el pedido con ID: " + id));

        pedido.setEstado(nuevoEstado);
        pedidoRepository.save(pedido);
        System.out.println("Pedido " + id + " actualizado a: " + nuevoEstado);
    }

    @Transactional
    public Pedido guardar(Pedido pedido) {
        if (pedido.getId() == null) {
            pedido.setFechaCreacion(LocalDateTime.now());
        }
        return pedidoRepository.save(pedido);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPreparados() {
        return pedidoRepository.findByEstado(EstadoPedido.PREPARADO);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPreparadosParaDespacho() {
        return pedidoRepository.findByEstado(EstadoPedido.PREPARADO)
                .stream()
                .filter(p -> p.getTipoPedido() == TipoPedido.DELIVERY)
                .collect(Collectors.toList());
    }

    @Transactional
    public void guardarPedido(Pedido pedido) {
        if (pedido.getId() == null) {
            pedido.setEstado(EstadoPedido.PENDIENTE);
            pedido.setFechaCreacion(LocalDateTime.now());

            if (pedido.getListaDetalles() != null) {
                for (DetallePedido d : pedido.getListaDetalles()) {
                    d.setCocinado(false);
                    // Si agregas el campo boolean entregado en el modelo, inicialízalo aquí:
                    // d.setEntregado(false);
                }
            }
        }

        if (pedido.getListaDetalles() != null) {
            for (DetallePedido detalle : pedido.getListaDetalles()) {
                detalle.setPedido(pedido);
            }
        }
        pedidoRepository.save(pedido);
    }

    // =========================================================================
    // 🔥 CONTROL MICROSCOPIO: DESPACHAR PLATO INDIVIDUAL EN COCINA
    // =========================================================================
    @Transactional
    public void despacharPlatoIndividual(Long pedidoId, Long productoId) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        if (p.getListaDetalles() == null) return;

        DetallePedido detalleTarget = p.getListaDetalles().stream()
                .filter(d -> d.getProducto().getId().equals(productoId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Plato no encontrado en esta orden"));

        // Marcar este ítem específico como cocinado y descontar sus insumos
        if (!detalleTarget.isCocinado()) {
            detalleTarget.setCocinado(true);
            insumoService.descontarInsumosPorPedido(detalleTarget.getProducto().getId(), detalleTarget.getCantidad());
            System.out.println("DEBUG COCINA -> Despachado individual: " + detalleTarget.getProducto().getNombre());
        }

        // LÓGICA DE SEMÁFORO GLOBAL RECALCULADA:
        // Verificamos si queda algún plato del mismo tipo pendiente en cocina
        boolean tieneFrioPendiente = p.getListaDetalles().stream()
                .anyMatch(d -> !d.isCocinado() && (d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRI")
                        || d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRÍ")));

        boolean tieneCalientePendiente = p.getListaDetalles().stream()
                .anyMatch(d -> !d.isCocinado() && d.getProducto().getCategoria().getNombre().toUpperCase().contains("CALIENTE"));

        p.setFrioListo(!tieneFrioPendiente);
        p.setCalienteListo(!tieneCalientePendiente);

        // Si ya no quedan platos pendientes en NINGUNA estación, la comanda general pasa a PREPARADO
        if (!tieneFrioPendiente && !tieneCalientePendiente) {
            p.setEstado(EstadoPedido.PREPARADO);
        }

        pedidoRepository.save(p);
    }

    // =========================================================================
    // 🔥 CONTROL MICROSCOPIO: ENTREGAR PLATO INDIVIDUAL EN MESA
    // =========================================================================
    @Transactional
    public void entregarPlatoIndividual(Long pedidoId, Long productoId) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        DetallePedido detalleTarget = p.getListaDetalles().stream()
                .filter(d -> d.getProducto().getId().equals(productoId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Plato no mapeado en comanda"));

        // Se simula la entrega al comensal (Si añadiste el atributo entregado, pon: detalleTarget.setEntregado(true))
        // Para consistencia con tu flujo actual, nos aseguramos que marque conformidad operativa
        System.out.println("DEBUG SALÓN -> Entregado conforme en mesa: " + detalleTarget.getProducto().getNombre());

        // Recalcular estado de la orden general: Si ya se entregó todo el lote, pasa a ASIGNADO (Listo para pagar)
        boolean todosEntregados = p.getListaDetalles().stream().allMatch(DetallePedido::isCocinado); // Modificable según atributos
        if (todosEntregados) {
            p.setEstado(EstadoPedido.ASIGNADO);
        }

        pedidoRepository.save(p);
    }

    // --- FLUJOS DE LOGÍSTICA DE TRASLADO MANTENIDOS INTEGRALMENTE ---
    public List<Pedido> optimizarTrayectoBurbuja(List<Pedido> pedidos) {
        int n = pedidos.size();
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                double distA = calcularDistancia(pedidos.get(j));
                double distB = calcularDistancia(pedidos.get(j + 1));
                if (distA > distB) {
                    Pedido temp = pedidos.get(j);
                    pedidos.set(j, pedidos.get(j + 1));
                    pedidos.set(j + 1, temp);
                }
            }
        }
        return pedidos;
    }

    private double calcularDistancia(Pedido p) {
        return Math.sqrt(Math.pow(p.getLatitud() - LAT_LOCAL, 2) + Math.pow(p.getLongitud() - LON_LOCAL, 2));
    }

    public List<List<Pedido>> generarSugerenciasDeRuta() {
        List<Pedido> preparados = listarPreparados();
        preparados.sort(Comparator.comparingDouble(p -> Math.atan2(p.getLatitud() - LAT_LOCAL, p.getLongitud() - LON_LOCAL)));
        List<List<Pedido>> grupos = new ArrayList<>();
        for (int i = 0; i < preparados.size(); i += 3) {
            List<Pedido> subLista = new ArrayList<>(preparados.subList(i, Math.min(i + 3, preparados.size())));
            grupos.add(optimizarTrayectoBurbuja(subLista));
        }
        return grupos;
    }

    @Transactional
    public void asignarRutaARepartidor(List<Long> pedidosIds, Long empleadoId) {
        Empleado repartidor = empleadoRepository.findById(empleadoId)
                .orElseThrow(() -> new IllegalArgumentException("El repartidor no existe."));
        for (Long id : pedidosIds) {
            Pedido p = pedidoRepository.findById(id).orElseThrow();
            p.setRepartidor(repartidor);
            p.setEstado(EstadoPedido.ASIGNADO);
            pedidoRepository.save(p);
        }
    }

    @Transactional
    public void completarEstacion(Long pedidoId, String tipoEstacion) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        if (p.getListaDetalles() != null) {
            for (DetallePedido d : p.getListaDetalles()) {
                if (d.getProducto() != null && d.getProducto().getCategoria() != null) {
                    String catNombre = d.getProducto().getCategoria().getNombre().toUpperCase();
                    if ("fria".equalsIgnoreCase(tipoEstacion) && (catNombre.contains("FRI") || catNombre.contains("FRÍ"))) {
                        d.setCocinado(true);
                        insumoService.descontarInsumosPorPedido(d.getProducto().getId(), d.getCantidad());
                    }
                    if ("caliente".equalsIgnoreCase(tipoEstacion) && catNombre.contains("CALIENTE")) {
                        d.setCocinado(true);
                        insumoService.descontarInsumosPorPedido(d.getProducto().getId(), d.getCantidad());
                    }
                }
            }
        }

        if ("fria".equalsIgnoreCase(tipoEstacion)) p.setFrioListo(true);
        else if ("caliente".equalsIgnoreCase(tipoEstacion)) p.setCalienteListo(true);

        boolean tieneFrio = p.getListaDetalles().stream().anyMatch(d -> d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRI") || d.getProducto().getCategoria().getNombre().toUpperCase().contains("FRÍ"));
        boolean tieneCaliente = p.getListaDetalles().stream().anyMatch(d -> d.getProducto().getCategoria().getNombre().toUpperCase().contains("CALIENTE"));

        if ((!tieneFrio || p.isFrioListo()) && (!tieneCaliente || p.isCalienteListo())) {
            p.setEstado(EstadoPedido.PREPARADO);
        }
        pedidoRepository.save(p);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosPorCobrar() { return pedidoRepository.listarPedidosPorCobrar(); }

    @Transactional
    public void cobrarPedido(Long id) { pedidoRepository.actualizarEstadoJPQL(id, EstadoPedido.PAGADO); }

    @Transactional
    public void asignarRepartidor(Long pedidoId, Empleado repartidor) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setRepartidor(repartidor);
        pedido.setEstado(EstadoPedido.ASIGNADO);
        pedidoRepository.save(pedido);
    }

    @Transactional
    public void iniciarRuta(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setEstado(EstadoPedido.EN_CAMINO);
        pedido.setFechaSalida(LocalDateTime.now());
        pedidoRepository.save(pedido);
    }

    @Transactional
    public void marcarComoEntregado(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setEstado(EstadoPedido.ENTREGADO);
        pedido.setFechaEntrega(LocalDateTime.now());
        pedidoRepository.save(pedido);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPedidosPorRepartidor(Long idEmpleado) { return pedidoRepository.buscarPedidosActivosPorRepartidor(idEmpleado); }

    public Pedido obtenerPorId(Long id) { return pedidoRepository.findById(id).orElse(null); }

    @Transactional(readOnly = true)
    public List<Pedido> listarDeliveryPendientesConCoordenadas() { return pedidoRepository.findDeliveryPendientesConCoordenadas(); }

    @Transactional(readOnly = true)
    public List<Pedido> listarPendientesDeCarta() { return pedidoRepository.findPedidosPendientesDeCarta(); }

    @Transactional
    public void aprobarPedidoACocina(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setEstado(EstadoPedido.EN_COCINA);
        pedidoRepository.save(pedido);
    }

    public List<DetallePedido> obtenerDetallesPorTipo(Long pedidoId, String tipoCocina) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElse(new Pedido());
        return pedido.getListaDetalles().stream()
                .filter(d -> {
                    String nombreCat = d.getProducto().getCategoria().getNombre().toUpperCase();
                    if ("caliente".equalsIgnoreCase(tipoCocina)) return nombreCat.contains("CALIENTE");
                    else return nombreCat.contains("FRI") || nombreCat.contains("FRÍ");
                })
                .collect(Collectors.toList());
    }
}