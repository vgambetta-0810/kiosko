import { Component } from 'react';

export default class PageErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Error al renderizar la página', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <section className="card page-error-fallback" role="alert">
            <h1>No se pudo mostrar Merma</h1>
            <p>Ocurrió un error inesperado. Podés volver a intentar sin perder el acceso al resto del sistema.</p>
            <button type="button" className="inventory-primary-action" onClick={() => window.location.reload()}>
              Volver a intentar
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
