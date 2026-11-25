provider "aws" {
  region = "eu-west-2"
}

module "vpc" {
  source = "./modules/vpc"

  vpc_name           = local.vpc_name
  vpc_cidr_block     = var.vpc_cidr_block
  availability_zones = var.availability_zones

  subnet_names = local.subnet_names
  subnet_cidrs = var.subnet_cidrs

  igw_name         = local.igw_name
  route_table_name = local.route_table_name
}

module "security_groups" {
  source = "./modules/security_groups"

  alb_sg_name = local.alb_sg_name
  ecs_sg_name = local.ecs_sg_name
}

module "ecr" {
  source = "./modules/ecr"

  ecr_name = local.ecr_name
}

