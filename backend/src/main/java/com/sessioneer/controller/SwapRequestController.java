package com.sessioneer.controller;

import com.sessioneer.dto.SwapMySwapsDto;
import com.sessioneer.dto.SwapRequestCreateDto;
import com.sessioneer.dto.SwapRequestResponseDto;
import com.sessioneer.dto.SwapRespondDto;
import com.sessioneer.service.SwapRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/swap-requests")
public class SwapRequestController {

    private final SwapRequestService swapRequestService;

    public SwapRequestController(SwapRequestService swapRequestService) {
        this.swapRequestService = swapRequestService;
    }

    @GetMapping("/me")
    public ResponseEntity<SwapMySwapsDto> getMySwaps() {
        return ResponseEntity.ok(swapRequestService.getMySwaps());
    }

    @PostMapping
    public ResponseEntity<SwapRequestResponseDto> create(@RequestBody SwapRequestCreateDto dto) {
        return ResponseEntity.ok(swapRequestService.createSwapRequest(dto));
    }

    @PostMapping("/{id}/respond")
    public ResponseEntity<SwapRequestResponseDto> respond(@PathVariable Long id, @RequestBody SwapRespondDto body) {
        return ResponseEntity.ok(swapRequestService.respondToSwapRequest(id, body.isAccept()));
    }
}