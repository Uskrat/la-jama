package com.web.restaurante.service;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.mapper.InsumoMapper;
import com.web.restaurante.model.Insumo;
import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.MovimientoInsumo;
import com.web.restaurante.model.Producto;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.repository.InsumoRepository;
import com.web.restaurante.repository.MovimientoRepository;
import com.web.restaurante.repository.ProductoRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InsumoService {

    private final InsumoRepository insumoRepository;
    private final InsumoProductoRepository insumoProductoRepository;
    private final ProductoRepository productoRepository;
    private final InsumoMapper insumoMapper;
    private final MovimientoRepository movimientoRepository;

    public List<InsumoDTO> listarInsumos() {
        return insumoRepository.findAll()
                .stream()
                .map(insumoMapper::toDTO)
                .collect(Collectors.toList());
    }

    public InsumoDTO guardarInsumo(InsumoDTO dto) {
        Insumo insumo = insumoMapper.toEntity(dto);
        insumo.setCategoria(dto.getCategoria());
        return insumoMapper.toDTO(insumoRepository.save(insumo));
    }

    public void eliminarInsumo(Long id) {
        insumoRepository.deleteById(id);
    }

    public List<InsumoProductoDTO> listarInsumosPorProducto(Long idProducto) {
        return insumoProductoRepository.findByProductoId(idProducto)
                .stream()
                .map(insumoMapper::toDTODetalle)
                .collect(Collectors.toList());
    }

    public List<InsumoProductoDTO> listarTodosLosInsumosProducto() {
        return insumoProductoRepository.findAll()
                .stream()
                .map(insumoMapper::toDTODetalle)
                .collect(Collectors.toList());
    }

    public InsumoProductoDTO agregarInsumoAProducto(Long idProducto, Long idInsumo, Double cantidad) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        Insumo insumo = insumoRepository.findById(idInsumo)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        InsumoProducto ip = new InsumoProducto();
        ip.setProducto(producto);
        ip.setInsumo(insumo);
        ip.setCantidadUsada(cantidad);

        return insumoMapper.toDTODetalle(insumoProductoRepository.save(ip));
    }

    public void descontarInsumosPorPedido(Long idProducto, int cantidadPedida) {
        List<InsumoProducto> insumos = insumoProductoRepository.findByProductoId(idProducto);

        for (InsumoProducto ip : insumos) {
            Insumo insumo = ip.getInsumo();

            // 1. Prevenimos errores si la cantidad usada en la receta es nula por algún motivo
            double cantidadUsada = (ip.getCantidadUsada() != null) ? ip.getCantidadUsada() : 0.0;
            double totalADescontar = cantidadUsada * cantidadPedida;

            // 2. Prevenimos el NullPointerException al leer el stock
            double stockActual = (insumo.getStockActual() != null) ? insumo.getStockActual() : 0.0;

            // 3. Actualizamos y guardamos
            insumo.setStockActual(stockActual - totalADescontar);
            insumoRepository.save(insumo);
        }
    }

    @Transactional
    public void registrarMovimiento(Insumo insumo, Double cantidad, String tipo, String motivo) {
        // 1. Calcular nuevo stock
        Double nuevoStock = insumo.getStockActual() + (tipo.equals("INGRESO") ? cantidad : -cantidad);

        // 2. Actualizar insumo
        insumo.setStockActual(nuevoStock);
        insumoRepository.save(insumo);

        // 3. Registrar el evento en el Kardex
        MovimientoInsumo mov = new MovimientoInsumo();
        mov.setInsumo(insumo);
        mov.setCantidad(cantidad);
        mov.setTipo(tipo);
        mov.setMotivo(motivo);
        mov.setStockResultante(nuevoStock);

        movimientoRepository.save(mov);
    }

    @Transactional
    public void eliminarInsumoDeReceta(Long idInsumoProducto) {
        insumoProductoRepository.deleteById(idInsumoProducto);
    }
}