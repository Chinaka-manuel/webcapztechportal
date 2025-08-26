// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/fbe5d1f1-a35b-47a7-8c54-80c47f04a9e1.png" 
            alt="WEBCAPZ Technologies Logo" 
            className="h-20 w-auto object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold mb-4"></h1>
        <p className="text-xl text-muted-foreground mb-8">
          
        </p>
        <Link to="/auth">
          <Button size="lg" className="w-full">
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
