import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const QRCodeScanner = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code Scanner</CardTitle>
        <CardDescription>Scan QR codes to mark your attendance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          QR Code scanning feature coming soon...
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;