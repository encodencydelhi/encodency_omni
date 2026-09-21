import Image from "next/image";

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full bg-white">
      <Image 
        src="/404-illustration.jpg" 
        alt="404 Page Not Found" 
        fill
        priority
        className="object-contain"
      />
    </main>
  );
}
