package com.web.restaurante.dto.usuario;

import com.web.restaurante.dto.perfil.PerfilDTO;

public record UsuarioDTO(
        Long id,
        String usuario,
        String correo,
        Integer estado,
        PerfilDTO perfil
) {
}
