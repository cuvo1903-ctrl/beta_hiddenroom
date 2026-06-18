# Configuración de la tienda Hidden Room

## 1. Aplicar la migración

La migración `20260618020000_store_commerce.sql` crea:

- `store_products`
- `store_orders`
- `store_order_items`
- `store_downloads`
- políticas RLS
- seed inicial
- la RPC transaccional `fulfill_store_order`

Aplica las migraciones al proyecto vinculado:

```bash
supabase db push
```

## 2. Configurar secretos

```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_xxx"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_xxx"
supabase secrets set SITE_URL="https://hiddenroom.mx"
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` están disponibles automáticamente
en las Edge Functions del proyecto. Nunca copies la service role ni las claves
secretas de Stripe al frontend.

## 3. Desplegar funciones

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

## 4. Configurar el webhook en Stripe

Crea un endpoint para:

```text
https://rpcunbkstadgngqrjafp.supabase.co/functions/v1/stripe-webhook
```

Suscribe el evento:

```text
checkout.session.completed
```

Copia el signing secret generado por Stripe a `STRIPE_WEBHOOK_SECRET`.

## 5. Productos digitales

`file_url` debe apuntar a un archivo protegido o a una ruta que después pueda
intercambiarse por una URL firmada. No uses archivos privados expuestos en un
bucket público. El webhook crea `store_downloads` solamente para compras
ligadas a usuarios autenticados.

## 6. Paneles

- Catálogo: `/store/`
- Mis compras: `/store/orders.html`
- Administración: `/store/admin.html`

El panel admin se oculta para usuarios normales, pero la protección real está
en las políticas RLS basadas en `public.is_admin()`.
