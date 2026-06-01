package com.web.restaurante.mapper;

import com.web.restaurante.dto.opcion.OpcionDTO;
import com.web.restaurante.model.Opcion;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface OpcionMapper {
    OpcionDTO toDTO(Opcion opcion);
}
