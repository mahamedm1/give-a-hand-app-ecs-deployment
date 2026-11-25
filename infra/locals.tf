locals {
  vpc_name         = "${var.project_name}-vpc"
  igw_name         = "${var.project_name}-igw"
  route_table_name = "${var.project_name}-rt"
  role_name        = "${var.project_name}-execution-role"
  alb_sg_name      = "${var.project_name}-alb-sg"
  ecs_sg_name      = "${var.project_name}-ecs-sg"
  ecr_name         = "${var.project_name}-ecr-repo"

  subnet_names = [
    for az in var.availability_zones : "${var.project_name}-subnet-${az}"
  ]

}