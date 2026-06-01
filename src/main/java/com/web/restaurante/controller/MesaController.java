package com.web.restaurante.controller;

import com.web.restaurante.dto.mesas.MesaDTO;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.service.MesaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin/mesas")
@RequiredArgsConstructor
public class MesaController {

    private final MesaService mesaService; // Inyectamos exclusivamente el servicio

    @GetMapping
    public String verPlanoMesas(Model model) {
        // El controlador recibe DTOs limpios desde el servicio
        List<MesaDTO> mesasDTO = mesaService.obtenerMesasParaSalon();
        List<Pedido> pedidosActivos = mesaService.obtenerPedidosActivos();

        model.addAttribute("mesas", mesasDTO);
        model.addAttribute("pedidos", pedidosActivos);
        return "admin/mesas";
    }

    @PostMapping("/entregar-plato/{idMesa}")
    @ResponseBody
    public String entregarPlato(@PathVariable Integer idMesa) {
        mesaService.entregarPlatoEnMesa(idMesa);
        return "OK";
    }

    @PostMapping("/liberar/{idMesa}")
    @ResponseBody
    public String liberarMesa(@PathVariable Long idMesa) {
        mesaService.liberarYFacturarMesa(idMesa);
        return "OK";
    }

    @GetMapping("/precuenta/{numeroMesa}")
    @ResponseBody
    public ResponseEntity<?> obtenerPrecuenta(@PathVariable Integer numeroMesa) {
        Map<String, Object> precuenta = mesaService.generarPrecuenta(numeroMesa);

        if (precuenta == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(precuenta);
    }
}