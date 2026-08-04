-- ==============================================================================
-- ATELIER V2 - ESTRUTURA DE BANCO DE DADOS PARA INTEGRATIVOS DO INSTAGRAM (APIFY)
-- Execute este script no SQL Editor do seu Dashboard Supabase.
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE PERFIS DO INSTAGRAM
CREATE TABLE IF NOT EXISTS public.instagram_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    biography TEXT,
    external_url TEXT,
    avatar_url TEXT,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_instagram UNIQUE (project_id)
);

-- 2. TABELA DE PUBLICAÇÕES SIMULADAS E SINCRONIZADAS DO FEED
CREATE TABLE IF NOT EXISTS public.instagram_feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instagram_profile_id UUID REFERENCES public.instagram_profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    post_id_external VARCHAR(255), -- ID vindo da API Apify (caso já publicado)
    image_url TEXT NOT NULL,
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    post_type VARCHAR(50) DEFAULT 'image', -- 'image', 'video', 'carousel', 'planned'
    status VARCHAR(50) DEFAULT 'pending_approval', -- 'pending_approval', 'approved', 'revision_requested'
    display_order INTEGER DEFAULT 0,
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.instagram_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_feed_posts ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE SEGURANÇA (RLS) - PERFIS
CREATE POLICY "Clientes e Equipe podem visualizar perfis do Instagram vinculados"
    ON public.instagram_profiles
    FOR SELECT
    USING (
        auth.uid() = client_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND cargo IN ('Dona / CEO', 'Atendimento / CX', 'Design Lead', 'Designer / Criativo', 'Gestor de Tráfego', 'Copywriter')
        )
    );

CREATE POLICY "Equipe pode atualizar perfis do Instagram"
    ON public.instagram_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND cargo IN ('Dona / CEO', 'Atendimento / CX', 'Design Lead', 'Designer / Criativo')
        )
    );

-- POLÍTICAS DE SEGURANÇA (RLS) - POSTS DO FEED
CREATE POLICY "Clientes e Equipe podem visualizar posts do feed"
    ON public.instagram_feed_posts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = instagram_feed_posts.project_id AND (projects.client_id = auth.uid() OR true)
        )
    );

CREATE POLICY "Clientes e Equipe podem atualizar status dos posts do feed"
    ON public.instagram_feed_posts
    FOR UPDATE
    USING (true);

-- INDEXES PARA MÁXIMA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_instagram_profiles_project_id ON public.instagram_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_instagram_profiles_client_id ON public.instagram_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_instagram_feed_posts_project_id ON public.instagram_feed_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_instagram_feed_posts_status ON public.instagram_feed_posts(status);
