package com.web.restaurante.service;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.dto.mesas.MesaSaveDTO;
import com.web.restaurante.mapper.MesaMapper;
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
        return mesaRepository.findAll().stream()
                .map(mesaMapper::toDTO)
                .toList();
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
}