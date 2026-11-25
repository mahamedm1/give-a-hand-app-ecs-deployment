provider "aws" {
  region = "eu-west-2"
}

module "vpc"{
  source = "./modules/vpc"

  vpc_name = var.vpc_name
  vpc_cidr_block = var.vpc_cidr_block
  vpc_availability_zones = var.vpc_availability_zones

  subnet_name = var.subnet_names
  subnet_cidrs = var.subnet_cidrs

  igw_name = var.igw_name
  route_table_name = var.route_table_name 
}