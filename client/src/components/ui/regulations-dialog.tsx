import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book } from "lucide-react";

export function RegulationsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Book className="h-4 w-4" />
          Ver Reglamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#F05023]">
            Reglamento y Funcionamiento de Virtual Agent
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] rounded-md border p-4">
          <div className="space-y-4">
            <p className="text-base">
              Bienvenido a Virtual Agent, tu aliado digital en el mundo de los bienes raíces. 
              Nuestra misión es construir una base de datos actualizada de propiedades en venta, 
              y recompensar tu esfuerzo en cada paso del proceso.
            </p>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Ingreso de Propiedades Nuevas</h3>
              <p>
                Cada vez que registres una propiedad que no se encuentre en nuestro sistema (considerada NUEVA), 
                recibirás una bonificación de 250 colones.
              </p>
              <p className="text-sm text-muted-foreground">
                Importante: Solo se premiarán las propiedades ingresadas por primera vez; aquellas que ya 
                hayan sido registradas por otros usuarios no serán elegibles para este pago.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Bonificación por Gestión de Venta</h3>
              <p>
                Si al contactar al propietario este acepta que Virtual Agent maneje la venta de su propiedad, 
                se te otorgará una bonificación adicional de 2,000 colones.
              </p>
              <p className="text-sm text-muted-foreground">
                Este incentivo reconoce tu labor al lograr que el propietario confíe en nosotros para 
                gestionar su venta.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Bonificación por Venta Exitosa</h3>
              <p>
                Cuando la oficina administradora de Virtual Agent cierre la venta de la propiedad, 
                recibirás un premio final de 100,000 colones.
              </p>
              <p className="text-sm text-muted-foreground">
                Esta bonificación es el reconocimiento máximo a tu contribución, ya que gracias a tu 
                registro se concretó una transacción exitosa.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">4. Resumen de Ganancias</h3>
              <p>Con un sencillo registro de una propiedad, tienes la posibilidad de ganar de forma progresiva:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>250 colones al ingresar la propiedad nueva.</li>
                <li>2,000 colones adicionales si el propietario aprueba que administremos la venta.</li>
                <li>Hasta 100,000 colones en el caso de que la propiedad se venda a través de Virtual Agent.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">5. Política de Duplicidad</h3>
              <p>
                Para mantener la integridad y confiabilidad de nuestra base de datos, las propiedades que 
                se registren y que ya hayan sido ingresadas por otros usuarios no contarán para ninguno de los pagos.
              </p>
            </div>

            <p className="text-base mt-6">
              En Virtual Agent creemos en el valor de la transparencia y el trabajo colaborativo. Con tu 
              aporte, no solo ayudas a crear una base de datos robusta y confiable, sino que también 
              tienes la oportunidad de transformar cada registro en una ganancia real. ¡Anímate a ser 
              parte de esta emocionante aventura y a disfrutar de cada etapa del proceso!
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
