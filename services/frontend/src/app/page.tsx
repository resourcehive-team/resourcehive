const resources = [
  { name: "Camera", owner: "Media Club", available: true },
  { name: "Projector", owner: "CSE Department", available: true },
  { name: "Microphone", owner: "Drama Society", available: false },
];

export default function Home() {
  return (
    <>
      <nav className="navbar navbar-light bg-light border-bottom">
        <div className="container">
          <a className="navbar-brand fw-bold" href="#">
            ResourceHive
          </a>
          <div>
            <a className="btn btn-link text-decoration-none text-dark" href="#resources">
              Resources
            </a>
            <button className="btn btn-primary">Login</button>
          </div>
        </div>
      </nav>

      <main>
        <div className="container py-5">
          <div className="row">
            <div className="col-lg-7">
              <h1>Share resources at the university</h1>
              <p className="lead mt-3">
                Students and university groups can list items here and let other
                students borrow them.
              </p>
              <a className="btn btn-primary me-2" href="#resources">
                See resources
              </a>
              <button className="btn btn-outline-secondary">Add resource</button>
            </div>
          </div>
        </div>

        <div className="bg-light border-top border-bottom" id="resources">
          <div className="container py-5">
            <h2 className="h3 mb-4">Resources</h2>

            <div className="row g-4">
              {resources.map((resource) => (
                <div className="col-md-4" key={resource.name}>
                  <div className="card h-100">
                    <div className="card-img-top bg-secondary-subtle text-center py-5 text-secondary">
                      Image here
                    </div>
                    <div className="card-body">
                      <h3 className="card-title h5">{resource.name}</h3>
                      <p className="card-text">Owner: {resource.owner}</p>
                      <span
                        className={resource.available ? "badge text-bg-success" : "badge text-bg-secondary"}
                      >
                        {resource.available ? "Available" : "Not available"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container py-5">
          <h2 className="h3">How to use it</h2>
          <ol className="mt-3">
            <li className="mb-2">Find an item.</li>
            <li className="mb-2">Send a request.</li>
            <li>Return it when you are done.</li>
          </ol>
        </div>
      </main>

      <footer className="border-top">
        <div className="container py-3">
          <small className="text-secondary">ResourceHive - University of Moratuwa</small>
        </div>
      </footer>
    </>
  );
}
