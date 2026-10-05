CREATE TABLE IF NOT EXISTS smartdocplan.user_worksites (
  "userId" integer NOT NULL REFERENCES smartdocplan.users(id),
  "worksiteId" integer NOT NULL REFERENCES smartdocplan.worksites(id),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "worksiteId")
);
CREATE INDEX IF NOT EXISTS user_worksites_worksite_idx ON smartdocplan.user_worksites ("worksiteId");
