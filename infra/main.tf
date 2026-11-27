provider "aws" {
  region = "eu-west-2"
}

module "vpc" {
  source = "./modules/vpc"

  vpc_name           = local.vpc_name
  vpc_cidr_block     = var.vpc_cidr_block
  availability_zones = var.availability_zones

  public_subnet_names  = local.public_subnet_names
  private_subnet_names = local.private_subnet_names
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  igw_name                 = local.igw_name
  nat_gateway_name         = local.nat_gateway_name
  default_route_table_name = local.default_route_table_name
  nat_route_table_name     = local.nat_route_table_name
}

module "security_groups" {
  source = "./modules/security_groups"
  vpc_id = module.vpc.vpc_id

  alb_sg_name = local.alb_sg_name
  ecs_sg_name = local.ecs_sg_name
}

module "ecr" {
  source = "./modules/ecr"

  ecr_name = local.ecr_name
}

module "alb" {
  source = "./modules/alb"

  vpc_id = module.vpc.vpc_id

  alb_name          = local.alb_name
  alb_sg_id         = module.security_groups.alb_security_group_id
  public_subnet_ids = module.vpc.public_subnet_ids

  target_group_name = local.target_group_name
}

module "acm" {
  source = "./modules/acm"

  domain_name       = locals.domain_name
  validation_method = var.validation_method
}
