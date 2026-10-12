package com.sessioneer.dto;

public class SwapUnitDto {
    private Long id;
    private String code;
    private String name;

    public SwapUnitDto(Long id, String code, String name) {
        this.id = id;
        this.code = code;
        this.name = name;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
}