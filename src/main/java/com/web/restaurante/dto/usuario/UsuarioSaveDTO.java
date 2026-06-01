package com.web.restaurante.dto.usuario;

public record UsuarioSaveDTO(
        Long id,
        String usuario,
        String correo,
        String clave,
        Long idPerfil
) {
}
