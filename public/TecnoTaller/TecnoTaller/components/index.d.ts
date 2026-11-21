import type * as React from 'react';
export type Estado = 'ingresado' | 'revision' | 'repuesto' | 'reparacion' | 'reparado' | 'listo' | 'entregado';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'danger' }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface EstadoOrdenProps { estado: Estado }
export declare function EstadoOrden(props: EstadoOrdenProps): React.ReactElement;
export interface TrazaOrdenProps { estado: Estado; fechas?: Partial<Record<Estado, string>> }
export declare function TrazaOrden(props: TrazaOrdenProps): React.ReactElement;
export interface DrawerProps {
  /** false lo oculta. */ abierto?: boolean;
  /** 'registro' 760px (detalle con pestañas) · 'formulario' 480px (crear/editar). */ tamano?: 'registro' | 'formulario';
  /** Línea superior en mono: código de orden, tipo de registro; puede incluir un EstadoOrden. */ clave?: React.ReactNode;
  titulo: string; subtitulo?: React.ReactNode;
  /** Botones del pie: Cancelar/Cerrar primero, la acción primaria al final. */ pie?: React.ReactNode;
  onCerrar: () => void; /** Muestra la flecha de volver cuando el drawer se abrió desde otro. */ onVolver?: () => void;
  /** Lo dibuja dentro de su contenedor en lugar de sobre la pantalla (previews, documentación). */ enLinea?: boolean;
  children?: React.ReactNode;
}
export declare function Drawer(props: DrawerProps): React.ReactElement | null;
declare global { interface Window { TecnoTaller: { Button: typeof Button; EstadoOrden: typeof EstadoOrden; TrazaOrden: typeof TrazaOrden; Drawer: typeof Drawer; ESTADOS: Estado[] } } }
