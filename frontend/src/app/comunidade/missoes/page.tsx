// src/app/comunidade/missoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Award, CheckCircle2, ArrowRight, Loader2,
  MessageSquare, HelpCircle, Users, Handshake, RefreshCw, Info, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const VALUE_CYCLE_STEPS = [
  {
    step: "01",
    title: "Conteúdo ou Pergunta Inicial",
    description:
      "Publicar uma dúvida real do seu negócio, um projeto em construção ou um aprendizado aplicável no Feed ou em Trocas.",
    ctaLabel: "Publicar no Feed ou Trocas",
    href: "/comunidade?destino=trocas",
    icon: <HelpCircle size={20} />
  },
  {
    step: "02",
    title: "Conversa com Respostas Úteis",
    description:
      "Contribuir nas dúvidas de outros empreendedores ou marcar uma resposta recebida como Solução Útil.",
    ctaLabel: "Ver perguntas sem resposta",
    href: "/comunidade?destino=feed&modo=atencao",
    icon: <MessageSquare size={20} />
  },
  {
    step: "03",
    title: "Descoberta de Pessoas com Afinidade",
    description:
      "Completar seu perfil profissional (o que oferece e o que procura) e conectar-se a membros complementares.",
    ctaLabel: "Explorar Diretório de Pessoas",
    href: "/comunidade?destino=pessoas",
    icon: <Users size={20} />
  },
  {
    step: "04",
    title: "Conexão, Feedback ou Colaboração",
    description:
      "Participar do Laboratório de Projetos com críticas construtivas ou iniciar uma parceria em Oportunidades.",
    ctaLabel: "Ir ao Laboratório de Projetos",
    href: "/comunidade?destino=laboratorio",
    icon: <Handshake size={20} />
  },
  {
    step: "05",
    title: "Retorno com Novos Aprendizados",
    description:
      "Aplicar os materiais do Estúdio Liz no seu negócio e compartilhar os resultados e bastidores com a rede.",
    ctaLabel: "Acessar Estúdio Liz",
    href: "/comunidade?destino=estudio",
    icon: <RefreshCw size={20} />
  }
];

const RECOGNITION_PILLARS = [
  {
    key: "ajuda_util",
    title: "Ajuda útil",
    subtitle: "Respostas marcadas como úteis por quem fez a pergunta",
    criteria:
      "Atribuído sempre que um membro resolve uma dúvida em Trocas ou recebe validação direta pela utilidade prática da sua resposta.",
    color: "bg-amber-50 border-amber-200 text-amber-800"
  },
  {
    key: "curadoria",
    title: "Curadoria",
    subtitle: "Materiais, referências e resumos relevantes compartilhados",
    criteria:
      "Atribuído a quem sintetiza aprendizados, compartilha referências qualificadas e enriquece o repertório estratégico da comunidade.",
    color: "bg-purple-50 border-purple-200 text-purple-800"
  },
  {
    key: "colaboracao",
    title: "Colaboração",
    subtitle: "Conexões, feedbacks construtivos e parcerias iniciadas",
    criteria:
      "Atribuído a membros que analisam projetos no Laboratório com profundidade ou estabelecem parcerias reais com outros negócios.",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800"
  },
  {
    key: "acolhimento",
    title: "Acolhimento",
    subtitle: "Boas-vindas e apoio aos novos membros",
    criteria:
      "Atribuído a quem recebe novos participantes, responde primeiras publicações e fortalece o senso de pertencimento no Vêneto.",
    color: "bg-blue-50 border-blue-200 text-blue-800"
  }
];

export default function CicloDeValorPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myRecognitions, setMyRecognitions] = useState<any[]>([]);
  const [cycleProgress, setCycleProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id || "";
        const res = await fetch(`/api/veneto?userId=${encodeURIComponent(uid)}`);
        const data = await res.json();

        const profiles: any[] = data.profiles || [];
        const me = profiles.find((p) => p.id === uid) || profiles[0];
        setCurrentUser(me);

        if (me) {
          const recs = (data.recognitions || []).filter((r: any) => r.user_id === me.id);
          setMyRecognitions(recs);

          const myPosts = (data.posts || []).filter((p: any) => p.author_id === me.id);
          const myConns = (data.connections || []).filter(
            (c: any) => c.follower_id === me.id || c.following_id === me.id
          );

          setCycleProgress({
            "01": myPosts.length > 0,
            "02": recs.some((r: any) => r.pillar === "ajuda_util") || myPosts.some((p: any) => (p.comments_count || 0) > 0),
            "03": Boolean(me.o_que_oferece && me.o_que_procura) || myConns.length > 0,
            "04":
              recs.some((r: any) => r.pillar === "colaboracao") ||
              myPosts.some((p: any) => p.post_type === "feedback" || p.post_type === "parceria"),
            "05": myPosts.some((p: any) => p.post_type === "aprendizado" || p.post_type === "conquista")
          });
        }
      } catch (err) {
        console.error("Erro ao carregar Ciclo de Valor:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 w-full">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  const completedStepsCount = Object.values(cycleProgress).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6 max-w-[1050px] mx-auto w-full animate-[fadeInUp_0.6s_ease-out_both] pb-12 px-2">
      {/* HEADER */}
      <div className="flex flex-col gap-2 mt-2">
        <Link
          href="/comunidade"
          className="inline-flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors font-roboto text-[10px] uppercase tracking-widest font-bold bg-white/70 w-fit px-4 py-2 rounded-full border border-white shadow-sm"
        >
          ← Voltar ao Vêneto
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <Award size={28} className="text-[var(--color-atelier-terracota)]" />
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-none">
            Ciclo de Valor & <span className="italic text-[var(--color-atelier-terracota)]">Reconhecimento.</span>
          </h1>
        </div>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/75 max-w-2xl mt-1 leading-relaxed">
          No Vêneto, não usamos rankings artificiais nem pontos por volume de postagens. Valorizamos trocas genuínas: o conteúdo cria conversas, as conversas constroem relações e as relações geram oportunidades.
        </p>
      </div>

      {/* BANNER DO CICLO DE VALOR (SEÇÃO 8) */}
      <div className="glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-[#0D1D30] to-[#3a332c] text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D49A6A]">
            O Princípio do Vêneto · Seção 8
          </span>
          <h2 className="font-elegant text-3xl md:text-4xl leading-tight">
            Você entra por uma necessidade. Fica pelas relações, pelo aprendizado e pelas oportunidades.
          </h2>
          <p className="text-xs text-white/75 leading-relaxed mt-1">
            Acompanhe abaixo as 5 etapas do Ciclo de Valor da rede e veja os reconhecimentos qualitativos atribuídos à sua trajetória.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/15 min-w-[230px] text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 block">
            Etapas Vivenciadas no Ciclo
          </span>
          <div className="font-elegant text-5xl text-[#D49A6A] my-1">
            {completedStepsCount} / 5
          </div>
          <span className="text-[11px] text-white/80 font-medium">
            { myRecognitions.length } reconhecimentos recebidos
          </span>
        </div>
      </div>

      {/* OS 4 PILARES DE RECONHECIMENTO TRANSPARENTE (SEÇÃO 10) */}
      <div className="glass-panel bg-white/80 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
              Reconhecimento Sem Gamificação Vazia · Seção 10
            </span>
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
              Os 4 Pilares de Contribuição Real
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-atelier-grafite)]/60 bg-[#E2ECF3] px-3.5 py-2 rounded-xl border border-gray-200">
            <ShieldCheck size={14} className="text-[var(--color-atelier-terracota)]" />
            Critérios claros, abertos e contestáveis no perfil
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RECOGNITION_PILLARS.map((p) => {
            const count = myRecognitions.filter((r) => r.pillar === p.key && !r.is_contested).length;
            return (
              <div
                key={p.key}
                className="p-5 rounded-2xl bg-[#E2ECF3] border border-gray-100 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${p.color}`}>
                      {p.title}
                    </span>
                    <h3 className="font-bold text-sm text-[var(--color-atelier-grafite)] mt-2">
                      {p.subtitle}
                    </h3>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                    {count}
                  </div>
                </div>
                <p className="text-xs text-[var(--color-atelier-grafite)]/70 leading-relaxed">
                  <strong>Critério:</strong> {p.criteria}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* AS 5 ETAPAS DO CICLO DE VALOR (SEÇÃO 8) */}
      <div className="flex flex-col gap-4">
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] px-1">
          As 5 Etapas do Ciclo de Valor no Vêneto
        </h2>
        {VALUE_CYCLE_STEPS.map((item) => {
          const isDone = Boolean(cycleProgress[item.step]);
          return (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel bg-white/80 p-6 rounded-3xl border border-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xs ${
                    isDone
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-[#E2ECF3] text-[var(--color-atelier-terracota)] border border-[#142C48]/20"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={20} /> : item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                      Etapa {item.step}
                    </span>
                    {isDone && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Vivenciada
                      </span>
                    )}
                  </div>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mt-0.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--color-atelier-grafite)]/75 mt-1 max-w-xl leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <Link
                href={item.href}
                className="px-5 py-3 rounded-xl bg-[var(--color-atelier-grafite)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors flex items-center gap-2 shrink-0 w-fit"
              >
                {item.ctaLabel} <ArrowRight size={13} />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}