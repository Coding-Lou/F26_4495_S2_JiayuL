<#--
  Outdoor Trip Companion: the only template this theme overrides (FEATURE-002 D28).

  Derived from the parent's base/login/login-page-expired.ftl (Keycloak 26.7.4;
  keycloak.v2 inherits it unchanged). The parent offers two "Click here" links,
  restart and continue, inside one paragraph. The design offers one action
  (section 21.7): the restart link, as real link text. The layout, the heading,
  the element ids, and the restart address are the parent's.
-->
<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        ${msg("pageExpiredTitle")}
    <#elseif section = "form">
        <p id="instruction1" class="instruction">${msg("pageExpiredMsg1")}</p>
        <p><a id="loginRestartLink" href="${url.loginRestartFlowUrl}">${msg("pageExpiredRestart")}</a></p>
    </#if>
</@layout.registrationLayout>
