package com.web.restaurante.service;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.mapper.MesaMapper;
import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MesaService {

    private final MesaRepository mesaRepository;
    private final PedidoRepository pedidoRepository;
    private final MesaMapper mesaMapper;

    public List<MesaDTO> obtenerMesasParaSalon() {
        List<Mesa> mesasEntidad = mesaRepository.findAll();

        return mesasEntidad.stream().map(mesa -> {
            MesaDTO dto = mesaMapper.toDTO(mesa);

            if (mesa.getMesaPadre() != null) {
                dto.setIdMesaPadre(mesa.getMesaPadre().getId());
            }

            if (mesa.getMesasHijas() != null && !mesa.getMesasHijas().isEmpty()) {
                List<Integer> numerosHijas = mesa.getMesasHijas().stream()
                        .map(Mesa::getNumero)
                        .toList();
                dto.setNumerosMesasHijas(numerosHijas);
            }

            return dto;
        }).toList();
    }

    public List<Pedido> obtenerPedidosActivos() {
        return pedidoRepository.findAll().stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();
    }

    @Transactional
    public void entregarPlatoEnMesa(Integer idMesa) {
        List<Pedido> pedidosPendientes = pedidoRepository.findByNumeroMesaAndEstado(idMesa, EstadoPedido.PENDIENTE);

        if (pedidosPendientes.isEmpty()) {
            throw new RuntimeException("No se encontró pedido pendiente para esta mesa");
        }

        Pedido p = pedidosPendientes.get(pedidosPendientes.size() - 1);
        p.setEstado(EstadoPedido.ENTREGADO);
        pedidoRepository.save(p);
    }

    @Transactional
    public void entregarPlatoIndividual(Long pedidoId, Long productoId) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        DetallePedido detalleTarget = p.getListaDetalles().stream()
                .filter(d -> d.getProducto().getId().equals(productoId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Plato no mapeado en comanda"));

        // MARCAMOS EL PLATO COMO ENTREGADO EN BD
        detalleTarget.setEntregado(true);

        // RECALCULAMOS SI EL PEDIDO GENERAL YA DEBE PASAR A "ASIGNADO" (Listo para pagar)
        // Esto sucede si todos los detalles del pedido tienen entregado = true
        boolean todosEntregados = p.getListaDetalles().stream().allMatch(DetallePedido::isEntregado);

        if (todosEntregados) {
            p.setEstado(EstadoPedido.ASIGNADO);
        }

        pedidoRepository.save(p);
    }

    @Transactional
    public void liberarYFacturarMesa(Long idMesa) {
        Mesa m = mesaRepository.findById(idMesa).orElseThrow();
        m.setEstado("DISPONIBLE");
        mesaRepository.save(m);

        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(m.getNumero())
                .stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        for (Pedido p : pedidosActivos) {
            p.setEstado(EstadoPedido.PAGADO);
            p.setNumeroMesa(null);
            p.setFechaEntrega(LocalDateTime.now());
            pedidoRepository.save(p);
        }
    }

    public Map<String, Object> generarPrecuenta(Integer numeroMesa) {
        List<Pedido> pedidos = pedidoRepository.findByNumeroMesa(numeroMesa)
                .stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        if (pedidos.isEmpty()) {
            return null;
        }

        Pedido pedidoActivo = pedidos.get(pedidos.size() - 1);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("idPedido", pedidoActivo.getId());
        respuesta.put("montoTotal", pedidoActivo.getMontoTotal());
        respuesta.put("detalles", pedidoActivo.getListaDetalles());

        return respuesta;
    }

    @Transactional
    public void desvincularMesa(Long idMesa) {
        Mesa mesa = mesaRepository.findById(idMesa)
                .orElseThrow(() -> new RuntimeException("Mesa no encontrada"));

        mesa.setMesaPadre(null);
        mesa.setEstado("DISPONIBLE");
        mesaRepository.save(mesa);
    }

    @Transactional
    public void desagruparGrupoCompleto(Long idMesaPadre) {
        Mesa padre = mesaRepository.findById(idMesaPadre)
                .orElseThrow(() -> new RuntimeException("Mesa principal no encontrada"));

        List<Pedido> pedidosActivos = pedidoRepository.findByNumeroMesa(padre.getNumero()).stream()
                .filter(p -> p.getEstado() == EstadoPedido.EN_COCINA || p.getEstado() == EstadoPedido.PENDIENTE)
                .toList();

        if (!pedidosActivos.isEmpty()) {
            throw new RuntimeException("No se puede desagrupar el bloque. Hay pedidos activos en cocina.");
        }

        if (padre.getMesasHijas() != null) {
            for (Mesa hija : padre.getMesasHijas()) {
                hija.setMesaPadre(null);
                hija.setEstado("DISPONIBLE");
                mesaRepository.save(hija);
            }
        }
    }

    @Transactional
    public void unificarMesas(Long idMesaPrincipal, List<Long> idsMesasHijas) {
        Mesa mesaPadre = mesaRepository.findById(idMesaPrincipal)
                .orElseThrow(() -> new RuntimeException("Mesa principal no encontrada"));

        List<Pedido> pedidosPadre = pedidoRepository.findByNumeroMesa(mesaPadre.getNumero()).stream()
                .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                .toList();

        Pedido pedidoPadreActivo = pedidosPadre.isEmpty() ? null : pedidosPadre.get(pedidosPadre.size() - 1);

        for (Long idHija : idsMesasHijas) {
            Mesa hija = mesaRepository.findById(idHija).orElseThrow();
            hija.setMesaPadre(mesaPadre);
            hija.setEstado("UNIFICADA");
            mesaRepository.save(hija);

            List<Pedido> pedidosHija = pedidoRepository.findByNumeroMesa(hija.getNumero()).stream()
                    .filter(p -> p.getEstado() != EstadoPedido.PAGADO && p.getEstado() != EstadoPedido.CANCELADO)
                    .toList();

            for (Pedido pHija : pedidosHija) {
                if (pedidoPadreActivo == null) {
                    pHija.setNumeroMesa(mesaPadre.getNumero());
                    pedidoRepository.save(pHija);
                    pedidoPadreActivo = pHija;
                } else {
                    if (pHija.getListaDetalles() != null) {
                        for (DetallePedido detalle : pHija.getListaDetalles()) {
                            detalle.setPedido(pedidoPadreActivo);
                            pedidoPadreActivo.getListaDetalles().add(detalle);
                            pedidoPadreActivo.setMontoTotal(pedidoPadreActivo.getMontoTotal() + detalle.getSubtotal());
                        }
                    }
                    pHija.setEstado(EstadoPedido.CANCELADO);
                    pedidoRepository.save(pHija);
                    pedidoRepository.save(pedidoPadreActivo);
                }
            }
        }
    }

    @Transactional
    public void eliminarDetallePedido(Long pedidoId, Long productoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

        DetallePedido detalle = pedido.getListaDetalles().stream()
                .filter(d -> d.getProducto().getId().equals(productoId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("El producto no está en la comanda"));

        // Validamos que NO esté cocinado (si cocinado es true, no se borra)
        if (detalle.isCocinado()) {
            throw new RuntimeException("No se puede eliminar: el plato ya pasó a cocina.");
        }

        pedido.getListaDetalles().remove(detalle);
        // Recalcular monto total
        double nuevoTotal = pedido.getListaDetalles().stream().mapToDouble(DetallePedido::getSubtotal).sum();
        pedido.setMontoTotal(nuevoTotal);

        pedidoRepository.save(pedido);
    }
}