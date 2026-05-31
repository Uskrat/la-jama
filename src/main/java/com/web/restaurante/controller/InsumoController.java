package com.web.restaurante.controller;

import com.web.restaurante.dto.InsumoDTO;
import com.web.restaurante.dto.InsumoProductoDTO;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.InsumoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/insumos")
public class InsumoController {

    private final InsumoService insumoService;
    private final ProductoRepository productoRepository;

    @GetMapping
    public String listarInsumos(Model model) {
        model.addAttribute("insumos", insumoService.listarInsumos());
        model.addAttribute("productos", productoRepository.findAll());
        model.addAttribute("insumosProductos", insumoService.listarTodosLosInsumosProducto());
        return "insumos";
    }

    @PostMapping("/guardar")
    public String guardarInsumo(@ModelAttribute InsumoDTO dto) {
        insumoService.guardarInsumo(dto);
        return "redirect:/insumos";
    }

    @PostMapping("/eliminar/{id}")
    public String eliminarInsumo(@PathVariable Long id) {
        insumoService.eliminarInsumo(id);
        return "redirect:/insumos";
    }

    @GetMapping("/producto/{idProducto}")
    @ResponseBody
    public List<InsumoProductoDTO> insumosPorProducto(@PathVariable Long idProducto) {
        return insumoService.listarInsumosPorProducto(idProducto);
    }

    @PostMapping("/producto/{idProducto}/agregar")
    public String agregarInsumoAProducto(@PathVariable Long idProducto,
                                         @RequestParam Long idInsumo,
                                         @RequestParam Double cantidad) {
        insumoService.agregarInsumoAProducto(idProducto, idInsumo, cantidad);
        return "redirect:/insumos";
    }
}