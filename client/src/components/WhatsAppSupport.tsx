import { MessageCircle } from 'lucide-react';

interface WhatsAppSupportProps {
  phoneNumber?: string;
  message?: string;
  className?: string;
}

export const WhatsAppSupport = ({
  phoneNumber = "19785236630",
  message = "Hi ProTaskerGeek! I need support.",
  className = ""
}: WhatsAppSupportProps) => {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 group animate-bounce hover:animate-none ${className}`}
      aria-label="Contact Support via WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
          Chat with Support
          <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
      </div>
    </a>
  );
};

export default WhatsAppSupport;