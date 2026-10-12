package com.sessioneer.dto;

import java.util.List;

public class SwapMySwapsDto {
    private List<SwapRequestResponseDto> outgoing;
    private List<SwapRequestResponseDto> incoming;

    public SwapMySwapsDto(List<SwapRequestResponseDto> outgoing, List<SwapRequestResponseDto> incoming) {
        this.outgoing = outgoing;
        this.incoming = incoming;
    }

    public List<SwapRequestResponseDto> getOutgoing() { return outgoing; }
    public List<SwapRequestResponseDto> getIncoming() { return incoming; }
}