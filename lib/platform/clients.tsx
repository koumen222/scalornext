'use client';

/**
 * Barrel client des pages publiques plateforme — frontière server/client
 * (même rôle que lib/storefront/clients.tsx) + types d'interop du legacy JS.
 */

import type { ComponentType } from 'react';

import LandingPageJs from '@/src/ecom/pages/LandingPage.jsx';
import WhyScalorJs from '@/src/ecom/pages/WhyScalor.jsx';
import TarifsJs from '@/src/ecom/pages/Tarifs.jsx';
import PrivacyPolicyJs from '@/src/ecom/pages/PrivacyPolicy.jsx';
import TermsOfServiceJs from '@/src/ecom/pages/TermsOfService.jsx';
import FormationJs from '@/src/ecom/pages/Formation.jsx';
import ProviderServiceJs from '@/src/ecom/pages/ProviderService.jsx';
import LoginJs from '@/src/ecom/pages/Login.jsx';
import RegisterJs from '@/src/ecom/pages/Register.jsx';
import ForgotPasswordJs from '@/src/ecom/pages/ForgotPassword.jsx';
import ResetPasswordJs from '@/src/ecom/pages/ResetPassword.jsx';
import SetupSuperAdminJs from '@/src/ecom/pages/SetupSuperAdmin.jsx';
import WorkspaceSetupJs from '@/src/ecom/pages/WorkspaceSetup.jsx';
import InviteAcceptJs from '@/src/ecom/pages/InviteAccept.jsx';
import AffiliateLoginJs from '@/src/ecom/pages/AffiliateLogin.jsx';
import AffiliateRegisterJs from '@/src/ecom/pages/AffiliateRegister.jsx';

export const LandingPage = LandingPageJs as ComponentType;
export const WhyScalor = WhyScalorJs as ComponentType;
export const Tarifs = TarifsJs as ComponentType;
export const PrivacyPolicy = PrivacyPolicyJs as ComponentType;
export const TermsOfService = TermsOfServiceJs as ComponentType;
export const Formation = FormationJs as ComponentType;
export const ProviderService = ProviderServiceJs as ComponentType;
export const Login = LoginJs as ComponentType;
export const Register = RegisterJs as ComponentType;
export const ForgotPassword = ForgotPasswordJs as ComponentType;
export const ResetPassword = ResetPasswordJs as ComponentType;
export const SetupSuperAdmin = SetupSuperAdminJs as ComponentType;
export const WorkspaceSetup = WorkspaceSetupJs as ComponentType;
export const InviteAccept = InviteAcceptJs as ComponentType;
export const AffiliateLogin = AffiliateLoginJs as ComponentType;
export const AffiliateRegister = AffiliateRegisterJs as ComponentType;
