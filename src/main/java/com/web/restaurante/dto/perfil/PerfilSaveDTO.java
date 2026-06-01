package com.web.restaurante.dto.perfil;

import java.util.Set;

public record PerfilSaveDTO(
        String nombre,
        String descripcion,
        Integer estado,
        Set<Long> idOpciones
) {
}
