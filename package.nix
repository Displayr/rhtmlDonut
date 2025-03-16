{ pkgs ? import <nixpkgs> {}, displayrUtils }:

pkgs.rPackages.buildRPackage {
  name = "rhtmlDonut";
  version = displayrUtils.extractRVersion (builtins.readFile ./DESCRIPTION); 
  src = ./.;
  description = ''R htmlwidget package for creating a detailed donut plot.'';
  propagatedBuildInputs = with pkgs.rPackages; [ 
    htmlwidgets
  ];
}
