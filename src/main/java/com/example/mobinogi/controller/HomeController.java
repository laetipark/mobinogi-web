package com.example.mobinogi.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * SPA를 위한 fallback 컨트롤러
 * React Router의 클라이언트 사이드 라우팅을 지원합니다.
 */
@Controller
public class HomeController {

    /**
     * React SPA를 위한 fallback 라우팅
     * API 경로가 아닌 모든 경로를 index.html로 리다이렉트합니다.
     */
    @RequestMapping(value = {
            "/",
            "/{path:^(?!api|static|actuator).*}/**"
    })
    public String fallback() {
        return "forward:/index.html";
    }
}
