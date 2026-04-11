import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  // Branding updated to Rey Automotriz
  title: "Iniciar sesión | Rey Automotriz - Sistema de Gestión",
  description: "Accede al Sistema de Gestión Empresarial de Rey Automotriz",
};

export default function SignIn() {
  return <SignInForm />;
}
