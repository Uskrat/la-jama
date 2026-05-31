package com.web.restaurante.service;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.mapper.InsumoMapper;
import com.web.restaurante.model.Insumo;
import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.Producto;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.repository.InsumoRepository;
import com.web.restaurante.repository.ProductoRepository;
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

    public List<InsumoDTO> listarInsumos() {
        return insumoRepository.findAll()
                .stream()
                .map(insumoMapper::toDTO)
                .collect(Collectors.toList());
    }

    public InsumoDTO guardarInsumo(InsumoDTO dto) {
        Insumo insumo = insumoMapper.toEntity(dto);
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
            double total = ip.getCantidadUsada() * cantidadPedida;
            insumo.setStockActual(insumo.getStockActual() - total);
            insumoRepository.save(insumo);
        }
    }
}