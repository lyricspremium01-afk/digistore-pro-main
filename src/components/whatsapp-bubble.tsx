import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function WhatsAppBubble() {
  const [phone, setPhone] = useState("237651010478");

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "whatsapp_number").maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPhone(String(data.value).replace(/\D/g, ""));
      });
  }, []);

  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 md:bottom-6 right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground shadow-elegant hover:scale-110 transition-transform"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
