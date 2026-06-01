package com.web.restaurante.mapper;

import com.web.restaurante.dto.perfil.PerfilDTO;
import com.web.restaurante.model.Perfil;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PerfilMapper {
    PerfilDTO toDTO(Perfil perfil);
}
