export function ScreenHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="screen-heading">
      <div className="screen-heading-copy">
        {eyebrow ? <p className="eyebrow mb-3 text-clay">{eyebrow}</p> : null}
        <h2 className="screen-title">{title}</h2>
        {description ? (
          <p className="screen-description">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 md:col-span-4 md:mt-0 md:justify-self-end">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
