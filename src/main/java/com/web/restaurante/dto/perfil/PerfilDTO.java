package com.web.restaurante.dto.perfil;

import com.web.restaurante.dto.opcion.OpcionDTO;

import java.util.Set;

public record PerfilDTO(
        Long id,
        String nombre,
        String descripcion,
        Integer estado,
        Set<OpcionDTO> opciones
) {
}
