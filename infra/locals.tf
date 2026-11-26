locals {
  vpc_name          = "${var.project_name}-vpc"
  igw_name          = "${var.project_name}-internet-gateway"
  nat_gateway_name  = "${var.project_name}-nat-gateway"
  default_route_table_name  = "${var.project_name}-route-table"
  nat_route_table_name  = "${var.project_name}-route-table"
  role_name         = "${var.project_name}-execution-role"
  alb_sg_name       = "${var.project_name}-alb-sg"
  ecs_sg_name       = "${var.project_name}-ecs-sg"
  ecr_name          = "${var.project_name}-ecr-repo"
  alb_name          = "${var.project_name}-ecs-alb"
  target_group_name = "${var.project_name}-target-group"

  public_subnet_names = [
    for az in var.availability_zones : "${var.project_name}-public-subnet-${az}"
  ]

  private_subnet_names = [
    for az in var.availability_zones : "${var.project_name}-private-subnet-${az}"
  ]

}