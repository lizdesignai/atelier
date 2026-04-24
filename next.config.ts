import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  async headers() {
    return [
      {
        // Aplica as regras de CORS a todas as rotas dentro de /api/
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // ATENÇÃO: Permite que o seu site institucional faça requisições. 
          // Se for testar localmente, deixe "*". Em produção rígida, mude para "https://www.lizdesign.com.br"
          { key: "Access-Control-Allow-Origin", value: "*" }, 
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};

export default nextConfig;