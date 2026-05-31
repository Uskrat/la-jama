package com.web.restaurante.controller;

import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.Usuario;
import com.web.restaurante.service.PedidoService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/admin/cocina")
@RequiredArgsConstructor
public class CocinaController {

    private final PedidoService pedidoService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/{tipo}")
    public String verMonitor(@PathVariable("tipo") String tipo, HttpSession session, Model model) {
        System.out.println("==== DEBUG COCINA START ====");
        Usuario user = (Usuario) session.getAttribute("usuarioLogueado");
        Empleado emp = (Empleado) session.getAttribute("empleadoLogueado");

        if (user == null) {
            System.out.println("DEBUG: No hay usuario en sesión.");
            return "redirect:/login";
        }

        String perfil = user.getPerfil().getNombre().toUpperCase();
        String tipoLimpio = tipo.trim().toLowerCase();
        System.out.println("DEBUG: Usuario: " + user.getUsuario() + " | Perfil: " + perfil + " | Estación: " + tipoLimpio);

        if (!perfil.contains("ADMIN")) {
            if (emp == null) {
                System.out.println("DEBUG: Error - Empleado es NULL");
                return "redirect:/dashboard?error=no_employee_data";
            }
            String cargo = emp.getCargo().getNombre().toUpperCase();
            System.out.println("DEBUG: Cargo del empleado: " + cargo);

            if ("caliente".equals(tipoLimpio) && !cargo.contains("CALIENTE")) {
                System.out.println("DEBUG: Bloqueado - No es cocina caliente");
                return "redirect:/dashboard?error=unauthorized";
            }
            if ("fria".equals(tipoLimpio) && (!cargo.contains("FRIO") && !cargo.contains("FRÍO"))) {
                System.out.println("DEBUG: Bloqueado - No es cocina fría");
                return "redirect:/dashboard?error=unauthorized";
            }
        }

        if ("caliente".equals(tipoLimpio)) {
            List<Pedido> pedidosCalientes = pedidoService.listarPedidosCalientes();
            model.addAttribute("pedidos", pedidosCalientes);
            model.addAttribute("estacion", "Cocina Caliente");
            model.addAttribute("tipoEstacion", "caliente");
            return "admin/cocina_caliente";
        } else if ("fria".equals(tipoLimpio)) {
            List<Pedido> pedidosFrios = pedidoService.listarPedidosFrios();
            model.addAttribute("pedidos", pedidosFrios);
            model.addAttribute("estacion", "Cocina Fría / Frescos");
            model.addAttribute("tipoEstacion", "fria");
            return "admin/cocina_fria";
        }

        return "redirect:/dashboard";
    }

    @GetMapping("/ticket/{pedidoId}/{tipo}")
    public String verTicketPDF(@PathVariable Long pedidoId, @PathVariable String tipo, Model model) {
        Pedido pedido = pedidoService.obtenerPorId(pedidoId);
        List<DetallePedido> detallesFiltrados = pedidoService.obtenerDetallesPorTipo(pedidoId, tipo);
        model.addAttribute("pedido", pedido);
        model.addAttribute("detalles", detallesFiltrados);
        model.addAttribute("tipoCocina", tipo.toUpperCase());
        return "admin/cocina/ticket_pdf";
    }

    @PostMapping("/completar")
    public String completarPedido(@RequestParam Long pedidoId, @RequestParam String tipoEstacion) {
        System.out.println("DEBUG: Completando estación " + tipoEstacion + " para pedido ID: " + pedidoId);

        pedidoService.completarEstacion(pedidoId, tipoEstacion);

        Pedido p = pedidoService.obtenerPorId(pedidoId);
        String identificadorMesa = (p != null) ? p.getCliente() : String.valueOf(pedidoId);

        messagingTemplate.convertAndSend("/topic/notificaciones",
                "Mesa " + identificadorMesa + " tiene su pedido de " + tipoEstacion + " listo.");

        return "redirect:/admin/cocina/" + tipoEstacion + "?success";
    }
}