// src/app/api/notify/route.ts
import { NextResponse } from 'next/server';
import {
  notifyManagementOnServer,
  notifyUserOnServer,
  sendStudioEmail,
  type StudioEmailTemplateData,
} from '@/lib/serverNotifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      mode,
      notifyManagement,
      userId,
      to,
      type = 'custom',
      inAppType = 'info',
      skipEmail = false,
      skipInApp = false,
      excludeUserId,
      clientName,
      collaboratorName,
      projectName,
      taskName,
      link,
      actionUrl,
      extraInfo,
      deadline,
      daysLeft,
      subject: topSubject,
      title: topTitle,
      body: topBody,
      message: topMessage,
      badgeText,
      buttonText,
      data: nestedData,
    } = body;

    const resolvedSubject =
      topSubject || topTitle || nestedData?.subject || nestedData?.title || 'Notificação — Studio Veronna';
    const resolvedBody =
      topBody || topMessage || nestedData?.body || nestedData?.message || '';
    const resolvedLink = link || actionUrl || nestedData?.link || nestedData?.actionUrl;

    const templateData: StudioEmailTemplateData = {
      clientName: clientName || nestedData?.clientName,
      collaboratorName: collaboratorName || nestedData?.collaboratorName,
      projectName: projectName || nestedData?.projectName,
      taskName: taskName || nestedData?.taskName,
      link: resolvedLink,
      extraInfo: extraInfo || nestedData?.extraInfo,
      deadline: deadline || nestedData?.deadline,
      daysLeft: daysLeft ?? nestedData?.daysLeft,
      subject: resolvedSubject,
      body: resolvedBody,
      badgeText: badgeText || nestedData?.badgeText,
      buttonText: buttonText || nestedData?.buttonText,
    };

    // 1. MODO GESTÃO (Notifica todos os Admins e Gestores ativos: In-App + E-mail)
    if (mode === 'management' || notifyManagement === true) {
      const result = await notifyManagementOnServer({
        title: resolvedSubject,
        message: resolvedBody,
        type: inAppType,
        actionUrl: resolvedLink || '/admin/fio',
        emailTemplateType: type,
        extraData: templateData,
        excludeUserId,
        skipEmail,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: 'Falha ao notificar liderança.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: 'management',
        notifiedCount: result.notifiedCount,
        sentEmails: result.sentEmails,
      });
    }

    // 2. MODO USUÁRIO POR ID (Notifica usuário específico por userId: In-App + E-mail)
    if (mode === 'user' || (userId && !to)) {
      if (!userId) {
        return NextResponse.json(
          { error: 'Parâmetro "userId" é obrigatório para mode="user".' },
          { status: 400 }
        );
      }

      const result = await notifyUserOnServer({
        userId,
        title: resolvedSubject,
        message: resolvedBody,
        type: inAppType,
        actionUrl: resolvedLink,
        emailTemplateType: type,
        extraData: templateData,
        skipEmail,
        skipInApp,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: 'Falha ao notificar usuário.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: 'user',
        sentEmail: result.sentEmail,
      });
    }

    // 3. MODO DIRETO POR E-MAIL (Compatibilidade com chamadas diretas `to` + `type`)
    if (!to || !type) {
      return NextResponse.json(
        { error: 'Parâmetros "to" (ou "userId" / "notifyManagement") e "type" são obrigatórios.' },
        { status: 400 }
      );
    }

    // Se também enviou userId junto com `to` e pediu registro In-App
    if (userId && !skipInApp) {
      await notifyUserOnServer({
        userId,
        title: resolvedSubject,
        message: resolvedBody,
        type: inAppType,
        actionUrl: resolvedLink,
        emailTemplateType: type,
        extraData: templateData,
        skipEmail: true,
        skipInApp: false,
      });
    }

    const emailResult = await sendStudioEmail({
      to,
      type,
      templateData,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Falha ao disparar e-mail.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sentTo: emailResult.sentTo,
      data: emailResult.data,
    });
  } catch (error: any) {
    console.error('[Notify API] Falha Crítica ao enviar notificação:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro de processamento interno ao enviar notificação.' },
      { status: 500 }
    );
  }
}
