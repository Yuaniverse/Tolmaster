import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import pkg from './package.json';

const googleAnalyticsPlugin = {
    name: 'inject-gtag',
    transformIndexHtml(html: string) {
        return html.replace(
            '<head>',
            `<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-T676NGX2RK"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-T676NGX2RK');
</script>`
        );
    },
};

export default defineConfig({
    plugins: [react(), viteSingleFile(), googleAnalyticsPlugin],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
        outDir: 'dist-single',
        emptyOutDir: true,
    },
});
