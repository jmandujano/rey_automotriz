import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  // Branding updated to Rey Automotriz
  title: "Registrarse | Rey Automotriz - Sistema de Gestión",
  description: "Crea una nueva cuenta en el Sistema de Gestión de Rey Automotriz",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
