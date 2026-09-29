# SABI V2 — Site GitHub Pages

Version sans PHP, pensée pour GitHub Pages, avec une esthétique sombre/noir + or inspirée du portail montré en référence.

## Mise en ligne
1. Dépose tous les fichiers du dossier à la racine de ton dépôt GitHub.
2. Active GitHub Pages sur la branche principale.
3. Ouvre `index.html`.

## Supabase
Le fichier `config.js` contient l’URL et la clé publishable du projet Supabase.
La clé publishable/anon est conçue pour être utilisée côté navigateur. La sécurité doit venir des politiques RLS Supabase.

Le schéma SQL fourni dans `supabase-schema.sql` correspond aux tables `agents`, `dossiers`, `rapports`, `preuves`, `personnes`, `audit_logs`.

## Compte directeur
Le profil agent existant doit avoir :
- matricule : SABI-001
- rôle : directeur
- niveau d’habilitation : 5
- actif : true

Le compte Auth Supabase doit utiliser le même `user_id` que la ligne de `public.agents`.

## Pages
- Accueil
- Le bureau
- Spécialités
- Méthode d’enquête
- Dossiers publics
- Contact
- Connexion agents
- Dashboard agent
- Gestion des dossiers

## Important
Le site ne contient aucun PHP. Toute authentification côté navigateur passe par Supabase Auth.


## Correctif GitHub Pages
Les images principales (logo et fond San Andreas) sont désormais intégrées directement dans les pages/CSS afin d’éviter les erreurs 404 liées aux chemins relatifs sur GitHub Pages.
